'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 bg-muted/30">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <div className="p-4 rounded-full bg-status-danger/10">
          <AlertTriangle className="h-8 w-8 text-status-danger" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Algo deu errado
          </h2>
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro inesperado no dashboard. Tente novamente ou volte para a página inicial.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/dashboard'}
        >
          Voltar ao Dashboard
        </Button>
        <Button onClick={reset}>
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}
