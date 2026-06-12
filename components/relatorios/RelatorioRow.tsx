'use client';

import Link from 'next/link';
import { ExportButtons } from './ExportButtons';
import { ArrowRight } from 'lucide-react';

export interface RelatorioRowProps {
  titulo: string;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
  formatos: Array<'excel' | 'pdf'>;
  onExport: (formato: 'excel' | 'pdf') => Promise<void>;
  isLoading?: boolean;
  loadingFormato?: 'excel' | 'pdf';
  disabled?: boolean;
  href?: string;
  /** Filtros (período, entidade) renderizados acima dos botões em telas pequenas e à esquerda em telas largas. */
  filtros?: React.ReactNode;
}

/**
 * Linha densa de relatório. Substitui o card grande: ícone + título + descrição
 * numa coluna que cresce, filtros e ações alinhados à direita em telas largas.
 */
export function RelatorioRow({
  titulo,
  descricao,
  icone: Icone,
  formatos,
  onExport,
  isLoading,
  loadingFormato,
  disabled,
  href,
  filtros,
}: RelatorioRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 lg:flex-row lg:items-center lg:gap-4">
      {/* Ícone + textos */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight text-foreground">{titulo}</p>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{descricao}</p>
        </div>
      </div>

      {/* Filtros */}
      {filtros && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{filtros}</div>
      )}

      {/* Ações */}
      <div className="shrink-0 lg:w-auto">
        {href ? (
          <Link
            href={href}
            className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground lg:w-auto"
          >
            Acessar
            <ArrowRight className="ml-2 h-3 w-3" aria-hidden="true" />
          </Link>
        ) : (
          <ExportButtons
            formatos={formatos}
            onExport={onExport}
            isLoading={isLoading}
            loadingFormato={loadingFormato}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
