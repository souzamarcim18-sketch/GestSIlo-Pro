'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Checa erro em query params
    const searchParams = new URLSearchParams(window.location.search);
    const qError = searchParams.get('error');
    const qErrorCode = searchParams.get('error_code');

    // Checa erro no hash fragment
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.slice(1));
    const hError = hashParams.get('error');
    const hErrorCode = hashParams.get('error_code');

    const errorCode = qErrorCode || hErrorCode;
    const hasError = qError || hError;

    if (hasError) {
      router.replace(errorCode === 'otp_expired' ? '/login?error=link_expirado' : '/login?error=link_invalido');
      return;
    }

    const supabase = getSupabaseClient();

    const redirect = (user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
      const isConvidado = !!user.app_metadata?.convidado_por;
      if (isConvidado) { router.replace('/auth/set-password'); return; }
      const fazendaId = user.user_metadata?.fazenda_id || user.app_metadata?.fazenda_id;
      router.replace(fazendaId ? '/dashboard' : '/dashboard/onboarding');
    };

    // Tenta buscar sessão ativa imediatamente (Supabase já processou o token e setou cookie)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        redirect(session.user);
        return true;
      }
      return false;
    };

    let resolved = false;

    checkSession().then(found => {
      if (found) { resolved = true; return; }

      // Fallback: escuta evento caso getSession ainda não tenha os cookies
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (resolved) return;
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          resolved = true;
          subscription.unsubscribe();
          redirect(session.user);
        }
      });

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.unsubscribe();
          router.replace('/login?error=link_invalido');
        }
      }, 5000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    });
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
