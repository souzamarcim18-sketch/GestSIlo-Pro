'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center px-4">
            <h1 className="text-3xl font-bold text-white mb-4">Erro na Aplicação</h1>
            <p className="text-gray-300 mb-2">
              Desculpe, algo inesperado aconteceu.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 mb-4 text-left bg-gray-800 p-4 rounded text-gray-200 text-sm max-w-lg mx-auto max-h-40 overflow-auto">
                <summary className="cursor-pointer font-semibold">Detalhes do erro (dev)</summary>
                <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
              </details>
            )}
            <div className="space-x-4">
              <button
                onClick={reset}
                className="inline-block px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="inline-block px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
              >
                Ir para Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
