'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AUTH_PROFILE_FETCH_TIMEOUT_MS } from '@/lib/auth/constants';
import { authLog } from '@/lib/auth/logger';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { prefetchDadosCriticos } from '@/lib/db/prefetch';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, needsOnboarding, user, profile, fazendaId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Prefetch proativo de dados críticos para uso offline
  useEffect(() => {
    if (!isOnline || !fazendaId) return;
    prefetchDadosCriticos(supabase, fazendaId);
  }, [isOnline, fazendaId]);

  const isOnboardingPage = pathname === '/dashboard/onboarding';

  useEffect(() => {
    if (!loading) return;

    authLog('DashboardLayout: auth loading started');
    const timeoutId = window.setTimeout(() => {
      authLog('DashboardLayout: auth loading timeout!');
      setLoadingTimeout(true);
    }, AUTH_PROFILE_FETCH_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Usuário convidado no primeiro acesso — redireciona para troca de senha
    // Verifica apenas user_metadata (controlado pelo próprio usuário via updateUser)
    // app_metadata é setado pelo admin e não é limpo pelo updateUser do cliente
    const isPrimeiroAcesso = user.user_metadata?.primeiro_acesso === true;
    if (isPrimeiroAcesso && pathname !== '/auth/set-password') {
      router.replace('/auth/set-password');
      return;
    }

    // Operador não tem acesso ao dashboard — pertence exclusivamente à página /operador
    if (profile?.perfil === 'Operador') {
      router.replace('/operador');
      return;
    }

    if (needsOnboarding && !isOnboardingPage) {
      router.replace('/dashboard/onboarding');
      return;
    }

    if (!needsOnboarding && isOnboardingPage) {
      router.replace('/dashboard');
      return;
    }
  }, [loading, needsOnboarding, user, profile, isOnboardingPage, pathname, router]);

  // Loading geral
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
          <span className="sr-only">Carregando...</span>
          {loadingTimeout && (
            <div className="text-center">
              <p className="text-destructive text-sm font-medium mb-2">
                Tempo limite ao carregar. Verifique sua conexão.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-brand-primary hover:underline font-medium"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Onboarding: layout limpo
  if (needsOnboarding && isOnboardingPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30 dark:bg-sidebar">
        {children}
      </div>
    );
  }

  // Aguarda redirect do useEffect — não renderiza children enquanto needsOnboarding
  if (needsOnboarding && !isOnboardingPage) {
    return null;
  }

  // Layout normal
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}

/**
 * Shell do dashboard: a sidebar (desktop) expande no hover ou quando fixada,
 * e o conteúdo principal é empurrado junto (push) para nunca ficar coberto.
 */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebar();

  return (
    <div className="h-screen relative overflow-hidden">
      <nav
        aria-label="Menu principal"
        className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-80"
      >
        <Sidebar collapsible />
      </nav>

      <main
        className={cn(
          'h-full overflow-y-auto flex flex-col bg-muted/30 transition-[padding] duration-200 ease-in-out',
          expanded ? 'md:pl-64' : 'md:pl-[68px]',
        )}
      >
        <header role="banner">
          <Header />
        </header>

        <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
