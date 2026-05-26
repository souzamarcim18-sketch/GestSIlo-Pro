'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { obterListaConsolidadaComprasQuery, type RawVinculo, calcularLinhasRelatorio } from '@/lib/supabase/planejamento-compras';
import type { PlanejamentoAtividadeComDetalhes } from '@/lib/types/planejamento-compras';

export interface PlanoAtividadeRow {
  id: string;
  nome: string;
  tipo_operacao: string;
  data_prevista: string;
  talhao_nome: string | null;
  status: string;
  qtd_insumos: number;
}

export interface ListaComprasRow {
  insumo_nome: string;
  unidade_medida: string;
  quantidade_total: number;
  estoque_atual: number;
  quantidade_a_comprar: number;
  status_compra: string;
  valor_estimado: number | null;
}

export interface RelatorioPlanejamentoResult {
  atividades: PlanoAtividadeRow[];
  listaCompras: ListaComprasRow[];
}

export async function getRelatorioPlanejamentoCompras(
  fazendaId: string
): Promise<RelatorioPlanejamentoResult> {
  const supabase = await createSupabaseServerClient();

  const [atividadesRes, listaConsolidada] = await Promise.all([
    supabase
      .from('planejamentos_atividade')
      .select(`
        id, tipo_operacao, data_prevista, status,
        talhao:talhoes(nome),
        insumos:planejamento_insumos(id)
      `)
      .eq('fazenda_id', fazendaId)
      .order('data_prevista', { ascending: true }),
    obterListaConsolidadaComprasQuery(fazendaId, { status_atividade: 'planejada' }),
  ]);

  type RawAtividade = {
    id: string;
    tipo_operacao: string;
    data_prevista: string;
    status: string;
    talhao: { nome: string } | { nome: string }[] | null;
    insumos: { id: string }[] | null;
  };

  const atividades: PlanoAtividadeRow[] = ((atividadesRes.data ?? []) as unknown as RawAtividade[]).map((p) => {
    const talhaoNome = !p.talhao ? null : Array.isArray(p.talhao) ? (p.talhao[0]?.nome ?? null) : p.talhao.nome;
    return {
      id: p.id,
      nome: `${p.tipo_operacao}${talhaoNome ? ` — ${talhaoNome}` : ''}`,
      tipo_operacao: p.tipo_operacao,
      data_prevista: p.data_prevista,
      talhao_nome: talhaoNome,
      status: p.status,
      qtd_insumos: p.insumos?.length ?? 0,
    };
  });

  const listaCompras: ListaComprasRow[] = listaConsolidada.map((l) => ({
    insumo_nome: l.insumo_nome,
    unidade_medida: l.unidade,
    quantidade_total: l.total_planejado,
    estoque_atual: l.estoque_atual,
    quantidade_a_comprar: l.quantidade_a_comprar,
    status_compra: l.status_compra,
    valor_estimado: l.valor_estimado,
  }));

  return { atividades, listaCompras };
}
