'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  const fazendaId = profile?.fazenda_id ?? null;
  const needsOnboarding = !!user && !!profile && !fazendaId;

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      authLog('[FETCH-PROFILE] START - userId:', currentUser.id);

      // Timeout explícito para evitar hang (10 segundos)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout after 10s')), 10000)
      );

      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        throw error;
      }

      authLog('[FETCH-PROFILE] SUCCESS - profile loaded:', data);
      setUser(currentUser);
      setProfile(data ?? null);
      setProfileError(null); // Limpar erro anterior se sucesso
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar perfil';
      const errorCode = (error as any)?.code;
      const errorStatus = (error as any)?.status;
      const errorDetails = (error as any)?.details;

      console.error('🔐 [FETCH-PROFILE] Full error object:', error);
      authError('[FETCH-PROFILE] ERROR:', { message: errorMessage, code: errorCode, status: errorStatus, details: errorDetails });
      setProfileError(errorMessage);
      setUser(currentUser);
      setProfile(null);
    } finally {
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
