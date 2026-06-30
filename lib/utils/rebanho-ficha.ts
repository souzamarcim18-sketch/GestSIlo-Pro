/**
 * Helpers puros da ficha do animal (SPEC-rebanho012, P2.4).
 *
 * Extraídos sem alteração de comportamento de app/dashboard/rebanho/[id]/page.tsx.
 * São funções puras (sem React, sem fetch) reutilizáveis pela ficha e pela camada
 * de Movimentações do Núcleo.
 */

import type { MovimentacaoListItem } from '@/lib/supabase/rebanho-movimentacoes';

/** Classe de cor do badge por tipo de movimentação. */
export function getBadgeColorMovimentacao(tipo: string): string {
  switch (tipo) {
    case 'nascimento':
      return 'border-green-600 text-green-600';
    case 'venda':
      return 'border-emerald-600 text-emerald-600';
    case 'morte':
      return 'border-red-600 text-red-600';
    case 'descarte':
      return 'border-orange-600 text-orange-600';
    case 'transferencia_lote':
      return 'border-muted-foreground text-muted-foreground';
    default:
      return 'border-muted-foreground text-muted-foreground';
  }
}

/** Rótulo legível por tipo de movimentação. */
export function getTipoLabelMovimentacao(tipo: string): string {
  const labels: Record<string, string> = {
    nascimento: 'Nascimento',
    venda: 'Venda',
    morte: 'Morte',
    descarte: 'Descarte',
    transferencia_lote: 'Transferência',
  };
  return labels[tipo] || tipo;
}

/** Texto de detalhes por tipo de movimentação. */
export function getDetalhesMovimentacao(mov: MovimentacaoListItem): string {
  switch (mov.tipo) {
    case 'venda':
      return `Comprador: ${mov.comprador}`;
    case 'morte':
      return `Causa: ${mov.observacoes || ''}`;
    case 'transferencia_lote':
      return `Lote: ${mov.lote_nome}`;
    case 'descarte':
      return `Motivo: ${mov.motivo_descarte}`;
    default:
      return mov.observacoes || '—';
  }
}

/**
 * Idade legível a partir da data de nascimento (ISO).
 * < 24 meses → "N meses"/"1 mês"; ≥ 24 meses → "N anos".
 * Retorna '—' quando a data não é informada.
 */
export function formatarIdadeAnimal(dataNascimento: string | null): string {
  if (!dataNascimento) return '—';
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  const meses =
    (hoje.getFullYear() - nascimento.getFullYear()) * 12 +
    (hoje.getMonth() - nascimento.getMonth());
  return meses >= 24
    ? `${Math.floor(meses / 12)} anos`
    : `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}
