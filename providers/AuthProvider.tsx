'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const hasWarmedUpRef = useRef(false);
  // ✅ NOVO: ref para cancelar fetches pendentes no logout
  const abortControllerRef = useRef<AbortController | null>(null);

  const fazendaId = profile?.fazenda_id ?? null;
  const needsOnboarding = !!user && !!profile && !fazendaId;

  // ✅ NOVO: função para cancelar qualquer fetch em andamento
  const cancelPendingFetch = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('🛑 [FETCH-PROFILE] Cancelling pending fetch...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    fetchingRef.current = null;
  }, []);

  const fetchProfile = useCallback(async (currentUser: User) => {
    if (fetchingRef.current === currentUser.id) {
      console.log('⏭️ [FETCH-PROFILE] Skipping - already fetching for user:', currentUser.id);
      return;
    }

    // ✅ Cancela fetch anterior (ex: troca de conta rápida)
    cancelPendingFetch();

    // ✅ Cria novo AbortController para este fetch
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchingRef.current = currentUser.id;

    let retries = 0;
    const MAX_RETRIES = 2;

    const attemptFetch = async (): Promise<any> => {
      // ✅ Checa se foi cancelado ANTES de cada tentativa
      if (abortController.signal.aborted) {
        throw new DOMException('Fetch cancelled', 'AbortError');
      }

      try {
        console.log(`🔐 [FETCH-PROFILE] ATTEMPT ${retries + 1}/${MAX_RETRIES + 1} for user:`, currentUser.id);
        authLog('[FETCH-PROFILE] START - userId:', currentUser.id);

        const timeoutMs = hasWarmedUpRef.current ? 30000 : 60000;

        const timeoutPromise = new Promise<never>((_, reject) => {
          console.log(`🔐 [FETCH-PROFILE] Setting ${timeoutMs}ms timeout...`);
          const timer = setTimeout(() => {
            reject(new Error(`Profile fetch timeout after ${timeoutMs}ms`));
          }, timeoutMs);

          // ✅ Limpa o timer se o fetch for cancelado
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Fetch cancelled', 'AbortError'));
          });
        });

        console.log('🔐 [FETCH-PROFILE] Making query...');
        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle(); // Changed from .single() to .maybeSingle() to handle missing profiles

        console.log('🔐 [FETCH-PROFILE] Awaiting promise.race...');
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          console.error('🔐 [FETCH-PROFILE] Query returned error:', error);
          throw error;
        }

        // If no profile exists, create a minimal one for onboarding
        if (!data) {
          console.log('⚠️  [FETCH-PROFILE] No profile found, creating minimal profile for onboarding');
          return {
            data: {
              id: currentUser.id,
              nome: currentUser.email?.split('@')[0] || 'Usuário',
              email: currentUser.email,
              perfil: 'Operador',
              fazenda_id: null,
            },
            error: null
          };
        }

        console.log('✅ [FETCH-PROFILE] SUCCESS - profile loaded:', data);
        return { data, error: null };
      } catch (error) {
        // ✅ Se foi cancelado (logout), não tenta retry
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        if (retries < MAX_RETRIES) {
          const isTimeout = error instanceof Error && error.message.includes('timeout');
          if (isTimeout) {
            console.log(`⚠️ [FETCH-PROFILE] Timeout, retrying... (${retries + 1}/${MAX_RETRIES})`);
            retries++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return attemptFetch();
          }
        }
        throw error;
      }
    };

    try {
      const { data } = await attemptFetch();

      // ✅ Checa se foi cancelado ANTES de atualizar estado
      if (abortController.signal.aborted) {
        console.log('🛑 [FETCH-PROFILE] Fetch completed but was cancelled, ignoring result');
        return;
      }

      authLog('[FETCH-PROFILE] SUCCESS - profile loaded:', data);
      setUser(currentUser);
      setProfile(data ?? null);
      setProfileError(null);
    } catch (error) {
      // ✅ Se foi cancelado (logout), sai silenciosamente
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('🛑 [FETCH-PROFILE] Fetch aborted (user signed out), ignoring');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar perfil';
      const errorCode = (error as any)?.code;
      const errorStatus = (error as any)?.status;
      const errorDetails = (error as any)?.details;

      console.error('❌ [FETCH-PROFILE] FINAL ERROR after retries:', { errorMessage, errorCode, errorStatus, errorDetails });
      authError('[FETCH-PROFILE] ERROR:', { message: errorMessage, code: errorCode, status: errorStatus, details: errorDetails });
      setProfileError(errorMessage);
      setUser(currentUser);
      setProfile(null);
    } finally {
      console.log('🔐 [FETCH-PROFILE] FINALLY - setting loading false');
      // ✅ Só limpa refs se este ainda é o controller ativo
      if (abortControllerRef.current === abortController) {
        fetchingRef.current = null;
        abortControllerRef.current = null;
      }
      // ✅ Só seta loading false se NÃO foi cancelado
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
      await fetchProfile(currentUser);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const warmupSupabase = async () => {
      try {
        console.log('🔐 [WARMUP] Heating up Supabase...');
        await supabase.from('profiles').select('id').limit(1);
        hasWarmedUpRef.current = true;
        console.log('🔐 [WARMUP] Supabase ready!');
      } catch (err) {
        console.log('🔐 [WARMUP] Supabase warmup skipped');
      }
    };

    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      await warmupSupabase();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null;

        authLog('Auth event:', event, 'user:', currentUser?.id);

        if (!currentUser) {
          authLog('Auth event: SIGNED_OUT');
          // ✅ CANCELA qualquer fetch pendente ANTES de limpar estado
          cancelPendingFetch();
          setUser(null);
          setProfile(null);
          setProfileError(null);
          setLoading(false);
          return;
        }

        authLog('Auth event: SIGNED_IN');
        setProfileError(null);
        await fetchProfile(currentUser);
      });

      unsubscribe = () => subscription.unsubscribe();
    };

    initAuth();

    return () => {
      // ✅ Cleanup: cancela fetches pendentes ao desmontar
      cancelPendingFetch();
      unsubscribe?.();
    };
  }, [fetchProfile, cancelPendingFetch]);

  return (
    <AuthContext.Provider
      value={{ user, profile, fazendaId, loading, needsOnboarding, profileError, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
