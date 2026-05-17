'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Usuário convidado não tem senha — detecta pela ausência de last_sign_in_at
        // ou pela presença de convidado_por no app_metadata
        const isConvidado = !!session.user.app_metadata?.convidado_por;
        router.replace(isConvidado ? '/auth/set-password' : '/dashboard');
      }

      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/auth/set-password');
      }
    });

    const timeout = setTimeout(() => {
      router.replace('/login?error=link_invalido');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-metal">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Verificando acesso...</p>
      </div>
    </div>
  );
}
