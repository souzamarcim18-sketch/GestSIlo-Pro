'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  fazendaId: string | null;
  loading: boolean;
  /** true quando o usuário está logado mas ainda não tem fazenda */
  needsOnboarding: boolean;
  /** Atualiza o state após criar fazenda (evita reload) */
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    fazendaId: null,
    loading: true,
    needsOnboarding: false,
    refreshProfile: async () => {},
  });

  useEffect(() => {
    const fetchProfile = async (user: User) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const fazendaId = profile?.fazenda_id ?? null;

      setState((prev) => ({
        ...prev,
        user,
        profile: profile ?? null,
        fazendaId,
        loading: false,
        needsOnboarding: !!profile && !fazendaId,
      }));
    };

    const refreshProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await fetchProfile(user);
    };

    // Expor refreshProfile no state
    setState((prev) => ({ ...prev, refreshProfile }));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;

      if (!user) {
        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          fazendaId: null,
          loading: false,
          needsOnboarding: false,
        }));
        return;
      }

      await fetchProfile(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
