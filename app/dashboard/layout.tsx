'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useAuth } from '@/hooks/useAuth';
import { AUTH_PROFILE_FETCH_TIMEOUT_MS } from '@/lib/auth/constants';
import { authLog } from '@/lib/auth/logger';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, needsOnboarding, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const isOnboardingPage = pathname === '/dashboard/onboarding';

  // Timeout de 5s se loading permanecer true
  useEffect(() => {
    if (!loading) {
      // Loading terminou, reset timeout state
      // (não chamar setState aqui para evitar cascading renders)
      return;
    }

    authLog('DashboardLayout: auth loading started');
    const timeoutId = window.setTimeout(() => {
      authLog('DashboardLayout: auth loading timeout!');
      setLoadingTimeout(true);
    }, AUTH_PROFILE_FETCH_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
      // Reset timeout state apenas se ainda estamos no efeito
      // Evita setState em efeito anterior sobrescrever este
    };
  }, [loading]);

  // Verificação de autenticação e redirecionamento
  useEffect(() => {
    if (loading) return;

    // Sem usuário → login
    if (!user) {
      router.replace('/login');
      return;
    }

    // Precisa criar fazenda e não está na página de onboarding → redireciona
    if (needsOnboarding && !isOnboardingPage) {
      router.replace('/dashboard/onboarding');
      return;
    }

    // Já tem fazenda mas está no onboarding → manda pro dashboard
    if (!needsOnboarding && isOnboardingPage) {
      router.replace('/dashboard');
      return;
    }
  }, [loading, needsOnboarding, user, isOnboardingPage, router]);

  // Loading geral
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" aria-hidden="true" />
          <span className="sr-only">Carregando...</span>
          {loadingTimeout && (
            <div className="text-center">
              <p className="text-red-600 text-sm font-medium mb-2">
                Tempo limite ao carregar. Verifique sua conexão.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-green-600 hover:underline font-medium"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Onboarding: layout limpo, sem sidebar/header
  if (needsOnboarding && isOnboardingPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        {children}
      </div>
    );
  }

  // Layout normal do dashboard
  return (
    <div className="h-screen relative overflow-hidden">
      <nav
        aria-label="Menu principal"
        className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r border-green-100"
      >
        <Sidebar />
      </nav>

      <main className="md:pl-72 h-full overflow-y-auto flex flex-col">
        <header role="banner">
          <Header />
        </header>

        <div className="flex-1">
          <div className="px-6 pt-4">
            <Breadcrumbs />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
