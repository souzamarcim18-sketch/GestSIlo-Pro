import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  PlanejamentoAtividadeComDetalhes,
  LinhaRelatorioCompras,
  FiltrosRelatorio,
  StatusCompra,
} from '@/lib/types/planejamento-compras';

// ─── Listar planejamentos ────────────────────────────────────────────────────

export async function listarPlanejamentosQuery(
  fazendaId: string,
  filtros?: {
    status?: string;
    talhao_id?: string;
    data_inicio?: string;
    data_fim?: string;
  },
  perfil?: string
): Promise<PlanejamentoAtividadeComDetalhes[]> {
  if (perfil === 'Operador') return [];

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('planejamentos_atividade')
    .select(`
      id, talhao_id, ciclo_id, tipo_operacao, data_prevista, status, observacoes,
      fazenda_id, created_by, created_at, updated_at,
      talhao:talhoes(id, nome, area_ha),
      ciclo:ciclos_agricolas(id, cultura),
      insumos:planejamento_insumos(
        id, planejamento_id, insumo_id, quantidade, fazenda_id, created_at,
        insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
      )
    `)
    .eq('fazenda_id', fazendaId)
    .order('data_prevista', { ascending: true });

  if (filtros?.status) {
    query = query.eq('status', filtros.status);
  }
  if (filtros?.talhao_id) {
    query = query.eq('talhao_id', filtros.talhao_id);
  }
  if (filtros?.data_inicio) {
    query = query.gte('data_prevista', filtros.data_inicio);
  }
  if (filtros?.data_fim) {
    query = query.lte('data_prevista', filtros.data_fim);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data ?? []) as unknown as PlanejamentoAtividadeComDetalhes[];
}

// ─── Obter planejamento por ID ────────────────────────────────────────────────

export async function obterPlanejamentoPorIdQuery(
  id: string,
  perfil?: string
): Promise<PlanejamentoAtividadeComDetalhes | null> {
  if (perfil === 'Operador') return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('planejamentos_atividade')
    .select(`
      id, talhao_id, ciclo_id, tipo_operacao, data_prevista, status, observacoes,
      fazenda_id, created_by, created_at, updated_at,
      talhao:talhoes(id, nome, area_ha),
      ciclo:ciclos_agricolas(id, cultura),
      insumos:planejamento_insumos(
        id, planejamento_id, insumo_id, quantidade, fazenda_id, created_at,
        insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data as unknown as PlanejamentoAtividadeComDetalhes;
}

// ─── Relatório consolidado de compras ────────────────────────────────────────

export type RawVinculo = {
  insumo_id: string;
  quantidade: number;
  planejamento: {
    id: string;
    status: string;
    data_prevista: string;
    talhao_id: string;
  } | null;
  insumo: {
    id: string;
    nome: string;
    unidade: string;
    estoque_atual: number;
    preco_unitario: number | null;
    ativo: boolean;
  } | null;
};

// Função pura: agrupa vínculos brutos em LinhaRelatorioCompras[]
// Exportada separadamente para permitir testes unitários sem Supabase
export function calcularLinhasRelatorio(
  vinculos: RawVinculo[],
  filtros?: Pick<FiltrosRelatorio, 'apenas_com_necessidade'>
): LinhaRelatorioCompras[] {
  const grupos = new Map<string, {
    insumo_id: string;
    insumo_nome: string;
    unidade: string;
    estoque_atual: number;
    preco_unitario: number | null;
    total_planejado: number;
    planejamentos_ids: string[];
  }>();

  for (const v of vinculos) {
    if (!v.insumo || !v.planejamento) continue;

    const existente = grupos.get(v.insumo_id);
    if (existente) {
      existente.total_planejado += Number(v.quantidade);
      existente.planejamentos_ids.push(v.planejamento.id);
    } else {
      grupos.set(v.insumo_id, {
        insumo_id: v.insumo_id,
        insumo_nome: v.insumo.nome,
        unidade: v.insumo.unidade,
        estoque_atual: Number(v.insumo.estoque_atual),
        preco_unitario: v.insumo.preco_unitario,
        total_planejado: Number(v.quantidade),
        planejamentos_ids: [v.planejamento.id],
      });
    }
  }

  let linhas: LinhaRelatorioCompras[] = Array.from(grupos.values()).map((g) => {
    const quantidade_a_comprar = Math.max(0, g.total_planejado - g.estoque_atual);
    const valor_estimado =
      g.preco_unitario != null ? quantidade_a_comprar * g.preco_unitario : null;

    let status_compra: StatusCompra;
    if (quantidade_a_comprar === 0) {
      status_compra = 'estoque_suficiente';
    } else if (g.estoque_atual > 0 && g.estoque_atual < g.total_planejado) {
      status_compra = 'comprado_parcialmente';
    } else {
      status_compra = 'pendente';
    }

    return {
      insumo_id: g.insumo_id,
      insumo_nome: g.insumo_nome,
      unidade: g.unidade,
      total_planejado: g.total_planejado,
      estoque_atual: g.estoque_atual,
      quantidade_a_comprar,
      preco_unitario: g.preco_unitario,
      valor_estimado,
      status_compra,
      planejamentos_ids: [...new Set(g.planejamentos_ids)],
    };
  });

  if (filtros?.apenas_com_necessidade) {
    linhas = linhas.filter((l) => l.status_compra !== 'estoque_suficiente');
  }

  linhas.sort((a, b) => {
    if (a.valor_estimado === null && b.valor_estimado === null) {
      return a.insumo_nome.localeCompare(b.insumo_nome, 'pt-BR');
    }
    if (a.valor_estimado === null) return 1;
    if (b.valor_estimado === null) return -1;
    if (b.valor_estimado !== a.valor_estimado) return b.valor_estimado - a.valor_estimado;
    return a.insumo_nome.localeCompare(b.insumo_nome, 'pt-BR');
  });

  return linhas;
}

export async function obterListaConsolidadaComprasQuery(
  fazendaId: string,
  filtros: FiltrosRelatorio,
  perfil?: string
): Promise<LinhaRelatorioCompras[]> {
  if (perfil === 'Operador') return [];

  const supabase = await createSupabaseServerClient();

  const statusFiltro = filtros.status_atividade ?? 'planejada';

  let query = supabase
    .from('planejamento_insumos')
    .select(`
      insumo_id, quantidade,
      planejamento:planejamentos_atividade!inner(
        id, status, data_prevista, talhao_id
      ),
      insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
    `)
    .eq('fazenda_id', fazendaId)
    .eq('planejamento.status', statusFiltro);

  if (filtros.data_inicio) {
    query = query.gte('planejamento.data_prevista', filtros.data_inicio);
  }
  if (filtros.data_fim) {
    query = query.lte('planejamento.data_prevista', filtros.data_fim);
  }
  if (filtros.talhao_id) {
    query = query.eq('planejamento.talhao_id', filtros.talhao_id);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const vinculos = (data ?? []) as unknown as RawVinculo[];

  return calcularLinhasRelatorio(vinculos, filtros);
}
