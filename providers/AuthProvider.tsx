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
  profileError: string | null; // Erro ao buscar perfil; null se sucesso ou ainda carregando
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
  const fetchingRef = useRef<string | null>(null); // Track current fetch to avoid duplicates
  const hasWarmedUpRef = useRef(false); // Track if warmup was done

  const fazendaId = profile?.fazenda_id ?? null;
  const needsOnboarding = !!user && !!profile && !fazendaId;

  const fetchProfile = useCallback(async (currentUser: User) => {
    // Evitar múltiplas requisições simultâneas do mesmo usuário
    if (fetchingRef.current === currentUser.id) {
      console.log('⏭️ [FETCH-PROFILE] Skipping - already fetching for user:', currentUser.id);
      return;
    }

    fetchingRef.current = currentUser.id;
    let retries = 0;
    const MAX_RETRIES = 2;

    const attemptFetch = async (): Promise<any> => {
      try {
        authLog(`[FETCH-PROFILE] ATTEMPT ${retries + 1}/${MAX_RETRIES + 1}`);

        // Timeout explícito para evitar hang
        // Antes do warmup: 60s (cold start Supabase)
        // Depois do warmup: 10s (servidor já está quente)
        const timeoutMs = hasWarmedUpRef.current ? 10000 : 60000;

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error(`Profile fetch timeout after ${timeoutMs}ms`);
            reject(timeoutError);
          }, timeoutMs);
        });

        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          throw error;
        }

        authLog('[FETCH-PROFILE] SUCCESS');
        return { data, error: null };
      } catch (error) {
        // Se timeout e ainda tem retries, tenta novamente
        if (retries < MAX_RETRIES) {
          const isTimeout = error instanceof Error && error.message.includes('timeout');
          if (isTimeout) {
            authLog(`[FETCH-PROFILE] Timeout, retrying...`);
            retries++;
            // Wait 2 segundos antes de retry
            await new Promise(resolve => setTimeout(resolve, 2000));
            return attemptFetch();
          }
        }
        throw error;
      }
    };

    try {
      const { data, error } = await attemptFetch();

      setUser(currentUser);
      setProfile(data ?? null);
      setProfileError(null); // Limpar erro anterior se sucesso
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar perfil';
      const errorCode = (error as any)?.code;
      const errorStatus = (error as any)?.status;

      authError('[FETCH-PROFILE] ERROR after retries:', { message: errorMessage, code: errorCode, status: errorStatus });
      setProfileError(errorMessage);
      setUser(currentUser);
      setProfile(null);
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  }, [fetchProfile]);

  useEffect(() => {
    // Warmup call silencioso para evitar cold start no Supabase
    const warmupSupabase = async () => {
      try {
        authLog('🔐 Warmup: Heating up Supabase...');
        // Requisição leve para aquentar o servidor
        await supabase.from('profiles').select('id').limit(1);
        hasWarmedUpRef.current = true;
        authLog('🔐 Warmup: Supabase ready!');
      } catch (err) {
        // Silenciosamente ignora erro (warmup é opcional)
        authLog('🔐 Warmup: Supabase warmup skipped');
      }
    };

    // Fazer warmup assim que o app carrega (não bloqueia nada)
    warmupSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      authLog('Auth event:', event, 'user:', currentUser?.id);

      if (!currentUser) {
        authLog('Auth event: SIGNED_OUT');
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      authLog('Auth event: SIGNED_IN');
      setProfileError(null); // Limpar erro anterior quando usuário faz login
      await fetchProfile(currentUser);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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
