'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

type SessionUser = {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Lê os parâmetros do hash ANTES de instanciar o client: o supabase-js tem
    // detectSessionInUrl ativo e pode limpar o hash ao ser criado. Capturar aqui
    // garante que não percamos o `type`/tokens por corrida.
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));

    const supabase = getSupabaseClient();

    const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
    const hasError = queryParams.get('error') || hashParams.get('error');

    if (hasError) {
      router.replace(
        errorCode === 'otp_expired'
          ? '/login?error=link_expirado'
          : '/login?error=link_invalido'
      );
      return;
    }

    // type indica a origem do link: recovery (redefinir senha) ou invite (1º acesso)
    const type = hashParams.get('type') || queryParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    // Decide o destino após a sessão estar estabelecida
    const destinoPorTipo = (user: SessionUser | null): string => {
      if (type === 'recovery') return '/reset-password';
      const isConvidado =
        !!user?.app_metadata?.convidado_por || type === 'invite';
      if (isConvidado) return '/auth/set-password';
      const fazendaId =
        user?.user_metadata?.fazenda_id || user?.app_metadata?.fazenda_id;
      return fazendaId ? '/dashboard' : '/dashboard/onboarding';
    };

    const finalizar = async () => {
      // Fluxo implícito: tokens no hash → estabelece a sessão manualmente
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error || !data.session) {
          router.replace('/login?error=link_invalido');
          return;
        }
        router.replace(destinoPorTipo(data.session.user));
        return;
      }

      // Fluxo PKCE ou sessão já estabelecida pelo detectSessionInUrl do supabase-js:
      // tenta ler a sessão diretamente.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace(destinoPorTipo(session.user));
        return;
      }

      // Fallback: aguarda o evento de auth (cookies podem não estar prontos ainda)
      let resolved = false;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if (resolved) return;
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY') && s) {
          resolved = true;
          subscription.unsubscribe();
          router.replace(destinoPorTipo(s.user));
        }
      });

      window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.unsubscribe();
          router.replace('/login?error=link_invalido');
        }
      }, 5000);
    };

    finalizar();
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
