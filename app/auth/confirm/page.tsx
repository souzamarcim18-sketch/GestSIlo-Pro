'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { ensureProfileAction } from './actions';

type SessionUser = {
  id?: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

// Página de confirmação de links de e-mail (convite aprovado / recuperação de senha).
//
// O Supabase verifica o token em supabase.co/auth/v1/verify e redireciona para cá.
// A resposta pode chegar de duas formas:
//   • PKCE: ?token_hash=...&type=... na QUERY STRING
//   • Implícito / erro: #access_token=... ou #error=... no HASH (fragmento)
//
// O hash NUNCA é enviado ao servidor, por isso esta página precisa ser um Client
// Component — uma route handler de servidor não conseguiria lê-lo e cairia sempre
// no fallback de "link inválido".
export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // Captura os parâmetros ANTES de instanciar o client: o supabase-js tem
    // detectSessionInUrl ativo e pode limpar o hash ao ser criado.
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));

    const supabase = getSupabaseClient();

    // 1) Erro vindo do verify endpoint (token expirado/consumido) — pode estar no hash
    const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
    const hasError = queryParams.get('error') || hashParams.get('error');
    if (hasError) {
      router.replace(
        errorCode === 'otp_expired'
          ? '/login?error=link_expirado'
          : '/login?error=link_invalido',
      );
      return;
    }

    // Parâmetros úteis das duas origens
    const tokenHash = queryParams.get('token_hash');
    const type = queryParams.get('type') || hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    // Decide o destino conforme o tipo de link e o estado do usuário
    const destinoPorTipo = (user: SessionUser | null): string => {
      if (type === 'recovery') return '/reset-password';
      const isConvidado = !!user?.app_metadata?.convidado_por || type === 'invite';
      if (isConvidado) return '/auth/set-password';
      const fazendaId =
        user?.user_metadata?.fazenda_id || user?.app_metadata?.fazenda_id;
      return fazendaId ? '/dashboard' : '/dashboard/onboarding';
    };

    const finalizar = async () => {
      // Fluxo PKCE: token_hash na query → verifica o OTP e estabelece a sessão
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as 'invite' | 'recovery' | 'email',
          token_hash: tokenHash,
        });
        if (error) {
          router.replace(
            error.message?.toLowerCase().includes('expired')
              ? '/login?error=link_expirado'
              : '/login?error=link_invalido',
          );
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user && type === 'email') {
          await ensureProfileAction(user.id, user.email ?? '', user.user_metadata ?? {});
        }
        router.replace(destinoPorTipo(user));
        return;
      }

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
        const { user } = data.session;
        await ensureProfileAction(user.id, user.email ?? '', user.user_metadata ?? {});
        router.replace(destinoPorTipo(user));
        return;
      }

      // Sessão já estabelecida pelo detectSessionInUrl do supabase-js
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

  return <AuthLoadingScreen message="Confirmando seu acesso..." />;
}
