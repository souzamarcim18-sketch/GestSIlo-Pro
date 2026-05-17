'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

// Página client-side que captura o hash fragment (#access_token=...) enviado
// pelo Supabase após processar o token de convite/recovery em supabase.co/auth/v1/verify
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const invitedAt = session.user.app_metadata?.invited_at;
        const isNewInvite = !!invitedAt;

        if (isNewInvite) {
          router.replace('/auth/set-password');
        } else {
          router.replace('/dashboard');
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/auth/set-password');
      }
    });

    // Fallback: se não houve evento em 4s, link inválido
    const timeout = setTimeout(() => {
      router.replace('/login?error=link_invalido');
    }, 4000);

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
