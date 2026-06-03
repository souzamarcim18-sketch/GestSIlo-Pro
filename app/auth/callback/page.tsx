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
        const isConvidado = !!session.user.app_metadata?.convidado_por;
        if (isConvidado) {
          router.replace('/auth/set-password');
          return;
        }
        // Novo usuário sem fazenda → onboarding; usuário existente → dashboard
        const fazendaId = session.user.user_metadata?.fazenda_id || session.user.app_metadata?.fazenda_id;
        router.replace(fazendaId ? '/dashboard' : '/dashboard/onboarding');
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Verificando acesso...</p>
      </div>
    </div>
  );
}
