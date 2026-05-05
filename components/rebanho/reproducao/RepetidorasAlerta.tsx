'use client';

import Link from 'next/link';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AnimalRepetidora } from '@/lib/supabase/rebanho-reproducao';

interface RepetidorasAlertaProps {
  animais: AnimalRepetidora[];
}

function formatRelativeDays(dateStr: string | null): string {
  if (!dateStr) return 'Sem data';

  const date = new Date(dateStr + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`;

  return `há ${Math.floor(diffDays / 365)} anos`;
}

export function RepetidorasAlerta({ animais }: RepetidorasAlertaProps) {
  if (animais.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Nenhuma vaca repetidora identificada
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Animais com 3+ coberturas sem confirmação de prenhez aparecem aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {animais.map((animal) => (
        <div
          key={animal.id}
          className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-foreground">
                    {animal.brinco} {animal.nome ? `- ${animal.nome}` : ''}
                  </p>
                  {animal.lote_id && (
                    <p className="text-sm text-muted-foreground">
                      Lote: {animal.lote_id}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                  {animal.coberturas_count} cobertura{animal.coberturas_count !== 1 ? 's' : ''}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  última {formatRelativeDays(animal.ultima_cobertura_data)}
                </span>
              </div>
            </div>

            <Link href={`/dashboard/rebanho/animais/${animal.id}`}>
              <Button variant="outline" size="sm">
                Ver detalhes
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
