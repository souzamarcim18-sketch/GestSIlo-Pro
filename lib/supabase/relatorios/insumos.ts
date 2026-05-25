import { supabase } from '@/lib/supabase';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';

export interface MovimentacaoInsumoRow {
  id: string;
  insumo_id: string;
  insumo_nome: string;
  tipo: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario: number | null;
  valor_total: number | null;
  data_movimentacao: string;
  origem: string | null;
  responsavel: string | null;
  observacoes: string | null;
}

type RawRow = {
  id: string;
  insumo_id: string;
  tipo: string;
  quantidade: number;
  valor_unitario: number | null;
  data_movimentacao: string;
  origem: string | null;
  responsavel: string | null;
  observacoes: string | null;
  insumos: { nome: string; unidade: string } | null;
};

export async function listMovimentacoesInsumoPorPeriodo(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<MovimentacaoInsumoRow[]> {
  const { gte, lte } = toUtcRangeFromLocal(from, to);

  const { data, error } = await supabase
    .from('movimentacoes_insumo')
    .select(
      'id, insumo_id, tipo, quantidade, valor_unitario, data_movimentacao, ' +
      'origem, responsavel, observacoes, insumos(nome, unidade)'
    )
    .eq('fazenda_id', fazendaId)
    .gte('data_movimentacao', gte)
    .lte('data_movimentacao', lte)
    .order('data_movimentacao', { ascending: false })
    .limit(10000);

  if (error) throw error;

  return ((data ?? []) as unknown as RawRow[]).map((m) => ({
    id: m.id,
    insumo_id: m.insumo_id,
    insumo_nome: m.insumos?.nome ?? '',
    tipo: m.tipo,
    quantidade: m.quantidade,
    unidade_medida: m.insumos?.unidade ?? '',
    valor_unitario: m.valor_unitario,
    valor_total:
      m.valor_unitario != null ? m.quantidade * m.valor_unitario : null,
    data_movimentacao: m.data_movimentacao,
    origem: m.origem,
    responsavel: m.responsavel,
    observacoes: m.observacoes,
  }));
}
