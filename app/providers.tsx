'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuth } from '@/providers/AuthProvider';

function ProvidersContent({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60000, // 1 minuto
            gcTime: 5 * 60 * 1000, // 5 minutos
          },
        },
      })
  );

  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export const Providers = Sentry.withErrorBoundary(ProvidersContent, {
  fallback: (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Oops! Algo deu errado</h1>
        <p className="text-gray-600 mb-4">
          Estamos trabalhando para corrigir o problema. Por favor, tente recarregar a página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Recarregar Página
        </button>
      </div>
    </div>
  ),
  showDialog: false,
});
