'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AlertaPlanejamento } from '@/lib/types/planejamento-silagem';
import { cn } from '@/lib/utils';

interface AlertasDinamicosProps {
  alertas: AlertaPlanejamento[];
}

export function AlertasDinamicos({ alertas }: AlertasDinamicosProps) {
  if (alertas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Alertas Dinâmicos</h3>
      {alertas.map((alerta, idx) => (
        <Card
          key={idx}
          className={cn(
            'p-4 border-l-4',
            alerta.tipo === 'warning'
              ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30'
              : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30'
          )}
        >
          <div className="flex gap-3">
            {alerta.tipo === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={cn(
                'text-sm',
                alerta.tipo === 'warning'
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-blue-800 dark:text-blue-200'
              )}
            >
              {alerta.mensagem}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
