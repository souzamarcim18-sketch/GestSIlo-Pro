'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  etapaAtual: number;
  labels?: string[];
}

export function Breadcrumb({ etapaAtual, labels }: BreadcrumbProps) {
  const defaultLabels = ['Sistema', 'Rebanho', 'Parâmetros', 'Resultados'];
  const displayLabels = labels || defaultLabels;
  const totalEtapas = 4;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Etapa {etapaAtual} de {totalEtapas}
        </h2>
        <span className="text-sm text-muted-foreground">
          {Math.round((etapaAtual / totalEtapas) * 100)}% completo
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {displayLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < etapaAtual;
          const isCurrent = stepNumber === etapaAtual;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              {/* Círculo do passo */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-semibold text-sm md:text-base transition-all',
                  isCurrent
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                    : isCompleted
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  stepNumber
                )}
              </div>

              {/* Label */}
              <div className="hidden sm:block ml-2 md:ml-3">
                <p
                  className={cn(
                    'text-xs md:text-sm font-medium',
                    isCurrent
                      ? 'text-foreground'
                      : isCompleted
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {label}
                </p>
              </div>

              {/* Linha conectora */}
              {stepNumber < totalEtapas && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-1 md:mx-2 rounded-full transition-all',
                    stepNumber < etapaAtual ? 'bg-green-200' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
