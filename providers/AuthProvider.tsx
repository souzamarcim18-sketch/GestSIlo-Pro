'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { authLog, authError } from '@/lib/auth/logger';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  fazendaId: string | null;
  loading: boolean;
  needsOnboarding: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  fazendaId: null,
  loading: true,
  needsOnboarding: false,
  profileError: null,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchingRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // ✅ NOVO: rastreia o último userId processado para evitar re-fetch redundante
  const lastProcessedUserIdRef = useRef<string | null>(null);

  const fazendaId = profile?.fazenda_id ?? null;
  const needsOnboarding = !!user && !!profile && !fazendaId;

  const cancelPendingFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    fetchingRef.current = null;
  }, []);

  const fetchProfile = useCallback(async (currentUser: User) => {
    if (fetchingRef.current === currentUser.id) {
      authLog('[FETCH-PROFILE] Skipping - already fetching for user:', currentUser.id);
      return;
    }

    cancelPendingFetch();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchingRef.current = currentUser.id;

    let retries = 0;
    const MAX_RETRIES = 2;

    const attemptFetch = async (): Promise<any> => {
      if (abortController.signal.aborted) {
        throw new DOMException('Fetch cancelled', 'AbortError');
      }

      try {
        authLog('[FETCH-PROFILE] START - userId:', currentUser.id);

        const timeoutMs = 10000; // 10s timeout (reduzido de 30s)

        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Profile fetch timeout after ${timeoutMs}ms`));
          }, timeoutMs);

          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Fetch cancelled', 'AbortError'));
          });
        });

        // ✅ Colunas específicas em vez de '*'
        const queryPromise = supabase
          .from('profiles')
          .select('id, fazenda_id, nome, perfil, created_at')
          .eq('id', currentUser.id)
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          console.error('[FETCH-PROFILE] Query error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          authError('[FETCH-PROFILE] Query error:', error.message || error);
          throw error;
        }

        return { data, error: null };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        const isTimeout = error instanceof Error && error.message.includes('timeout');
        authError('[FETCH-PROFILE] Attempt error:', error instanceof Error ? error.message : error, 'isTimeout:', isTimeout);

        // Só retenta em caso de timeout; outros erros (RLS, conexão) são imediatos
        if (isTimeout && retries < MAX_RETRIES) {
          retries++;
          authLog('[FETCH-PROFILE] Retrying after timeout...', retries);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return attemptFetch();
        }

        // Erros não-timeout (RLS, query, etc) não retentam: fail-fast
        throw error;
      }
    };

    try {
      const { data } = await attemptFetch();

      if (abortController.signal.aborted) {
        return;
      }

      authLog('[FETCH-PROFILE] SUCCESS');
      setUser(currentUser);
      setProfile(data ?? null);
      setProfileError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar perfil';
      authError('[FETCH-PROFILE] FINAL ERROR - continuing without profile:', errorMessage);

      // ✅ Continua o fluxo imediatamente mesmo com erro - não bloqueia entrada
      setUser(currentUser);
      setProfile(null);
      setProfileError(errorMessage);
    } finally {
      if (abortControllerRef.current === abortController) {
        fetchingRef.current = null;
        abortControllerRef.current = null;
      }
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cancelPendingFetch]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      // Força re-fetch ignorando o cache de userId
      lastProcessedUserIdRef.current = null;
      await fetchProfile(currentUser);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      // ✅ Removido o warmup — era 1 query desnecessária a cada load

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null;
        const currentUserId = currentUser?.id ?? null;

        authLog('Auth event:', event, 'user:', currentUserId);

        // ✅ FIX PRINCIPAL: ignora eventos que NÃO mudam o usuário
        // TOKEN_REFRESHED, USER_UPDATED etc. não precisam refazer fetchProfile
        if (
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'PASSWORD_RECOVERY' ||
          event === 'MFA_CHALLENGE_VERIFIED'
        ) {
          authLog('Auth event ignored (no user change):', event);
          return;
        }

        // SIGNED_OUT
        if (!currentUser) {
          authLog('Auth event: SIGNED_OUT');
          cancelPendingFetch();
          lastProcessedUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setProfileError(null);
          setLoading(false);
          return;
        }

        // ✅ FIX: se já processamos esse userId, não refaz
        // Isso evita o INITIAL_SESSION + SIGNED_IN duplicados
        if (lastProcessedUserIdRef.current === currentUserId) {
          authLog('Auth event: same user already processed, skipping');
          return;
        }

        lastProcessedUserIdRef.current = currentUserId;
        authLog('Auth event: processing user', currentUserId);
        setProfileError(null);
        await fetchProfile(currentUser);
      });

      unsubscribe = () => subscription.unsubscribe();
    };

    initAuth();

    return () => {
      cancelPendingFetch();
      unsubscribe?.();
    };
  }, [fetchProfile, cancelPendingFetch]);

  // ✅ FIX: memoiza o value para evitar re-renders desnecessários
  // dos consumidores quando o Provider re-renderiza por outros motivos
  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      fazendaId,
      loading,
      needsOnboarding,
      profileError,
      refreshProfile,
    }),
    [user, profile, fazendaId, loading, needsOnboarding, profileError, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
