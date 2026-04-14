'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
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

  // Lazy initialization: lê localStorage apenas uma vez na montagem
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const isOnboardingPage = pathname === '/dashboard/onboarding';

  // Escutar mudanças futuras do localStorage (abas diferentes)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Timeout de 5s se loading permanecer true
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

  // Verificação de autenticação e redirecionamento
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
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
  }, [loading, needsOnboarding, user, isOnboardingPage, router]);

  // Loading geral
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" role="status" aria-live="polite">
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
                className="text-sm text-primary hover:underline font-medium"
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
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-sidebar">
        {children}
      </div>
    );
  }

  // Layout normal do dashboard
  return (
    <div className="h-screen relative overflow-hidden">
      <nav
        aria-label="Menu principal"
        className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-80 border-r border-border dark:border-sidebar-border transition-all duration-300 ease-in-out"
      >
        <Sidebar />
      </nav>

      <main
        className={cn(
          "h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out bg-muted/30",
          sidebarCollapsed ? "md:pl-16" : "md:pl-72"
        )}
      >
        <header role="banner">
          <Header />
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
