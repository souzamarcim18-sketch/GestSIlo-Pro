'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMovimentacoesPorInsumo } from '@/lib/hooks/useMovimentacoes';
import type { Insumo } from '@/types/insumos';
import { EmptyState } from '@/components/ui/EmptyState';

interface HistoricoInsumoDialogProps {
  insumo: Insumo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_SAIDA_LABEL: Record<string, string> = {
  USO_INTERNO: 'Uso interno',
  TRANSFERENCIA: 'Transferência',
  VENDA: 'Venda',
  DEVOLUCAO: 'Devolução',
  DESCARTE: 'Descarte',
  TROCA: 'Troca',
};

export default function HistoricoInsumoDialog({ insumo, open, onOpenChange }: HistoricoInsumoDialogProps) {
  const { data: movimentacoes = [], isLoading } = useMovimentacoesPorInsumo(insumo?.id ?? '');

  const sorted = [...movimentacoes].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Histórico de Movimentações — {insumo?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2 pr-1">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState title="Nenhuma movimentação registrada para este insumo." />
          ) : (
            <div className="space-y-1.5">
              {sorted.map((mov) => {
                const isEntrada = mov.tipo === 'Entrada';
                const isAjuste = mov.tipo === 'Ajuste';
                return (
                  <div
                    key={mov.id}
                    className={[
                      'flex items-center gap-3 px-3 py-2 rounded border text-sm',
                      isEntrada
                        ? 'border-green-200/50 bg-green-50/30 dark:bg-green-950/20 dark:border-green-900/30'
                        : isAjuste
                        ? 'border-yellow-200/50 bg-yellow-50/30 dark:bg-yellow-950/20 dark:border-yellow-900/30'
                        : 'border-red-200/50 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/30',
                    ].join(' ')}
                  >
                    {/* Ícone */}
                    <div className="shrink-0">
                      {isEntrada ? (
                        <ArrowDownRight className="h-4 w-4 text-green-600" />
                      ) : isAjuste ? (
                        <RefreshCw className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>

                    {/* Data */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap w-12 shrink-0">
                      {format(new Date(mov.data + 'T00:00:00'), 'dd/MM/yy', { locale: ptBR })}
                    </span>

                    {/* Tipo badge */}
                    <Badge
                      variant="outline"
                      className={[
                        'text-xs shrink-0',
                        isEntrada ? 'border-green-500/40 text-green-700 dark:text-green-400' :
                        isAjuste  ? 'border-yellow-500/40 text-yellow-700 dark:text-yellow-400' :
                                    'border-red-500/40 text-red-700 dark:text-red-400',
                      ].join(' ')}
                    >
                      {mov.tipo}
                    </Badge>

                    {/* Subtipo saída */}
                    {mov.tipo_saida && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {TIPO_SAIDA_LABEL[mov.tipo_saida] ?? mov.tipo_saida}
                      </span>
                    )}

                    {/* Observações */}
                    {mov.observacoes && (
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {mov.observacoes}
                      </span>
                    )}
                    {!mov.observacoes && <span className="flex-1" />}

                    {/* Quantidade */}
                    <span className="font-mono text-sm font-medium whitespace-nowrap shrink-0">
                      {isAjuste && mov.sinal_ajuste === -1 ? '−' : isAjuste ? '+' : ''}
                      {mov.quantidade} {insumo?.unidade}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
