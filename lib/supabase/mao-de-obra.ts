'use server';

import { createSupabaseServerClient } from './server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  Colaborador,
  AtividadeMaoObra,
  AtividadeMaoObraColaborador,
  AtividadeComColaboradores,
  ColaboradorComHistorico,
  ColaboradorResumido,
  FuncaoColaborador,
  VinculoColaborador,
  TipoAtividade,
  KpisMaoObra,
} from '@/lib/types/mao-de-obra';

const COLABORADOR_COLS =
  'id, fazenda_id, nome, funcao, vinculo, tipo_valor, valor_ref, ativo, observacoes, created_at, updated_at';

const ATIVIDADE_COLS =
  'id, fazenda_id, data, tipo_atividade, duracao_tipo, duracao_valor, ' +
  'custo_calculado, custo_manual, custo_final, ' +
  'talhao_id, silo_id, maquina_id, observacoes, despesa_id, created_at, updated_at';

const ATIVIDADE_COLAB_COLS =
  'id, atividade_id, colaborador_id, custo_colaborador';

// ─── Filtros ──────────────────────────────────────────────────────────────────

interface FiltrosColaborador {
  ativo?: boolean;
  funcao?: FuncaoColaborador;
  vinculo?: VinculoColaborador;
}

interface FiltrosAtividade {
  colaborador_id?: string;
  tipo_atividade?: TipoAtividade;
  data_inicio?: string;
  data_fim?: string;
  vinculo?: 'talhao' | 'silo' | 'maquina' | 'nenhum';
}

// ─── Colaboradores ────────────────────────────────────────────────────────────

export async function listColaboradores(
  supabase: SupabaseClient<Database>,
  filtros: FiltrosColaborador = {},
): Promise<Colaborador[]> {
  let query = supabase
    .from('colaboradores')
    .select(COLABORADOR_COLS)
    .order('nome');

  if (filtros.ativo !== undefined) {
    query = query.eq('ativo', filtros.ativo);
  }
  if (filtros.funcao) {
    query = query.eq('funcao', filtros.funcao);
  }
  if (filtros.vinculo) {
    query = query.eq('vinculo', filtros.vinculo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Colaborador[];
}

export async function getColaboradorById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Colaborador | null> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select(COLABORADOR_COLS)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as Colaborador;
}

export async function getColaboradorComHistorico(
  supabase: SupabaseClient<Database>,
  colaboradorId: string,
): Promise<ColaboradorComHistorico | null> {
  const { data: colab, error: colaborError } = await supabase
    .from('colaboradores')
    .select(COLABORADOR_COLS)
    .eq('id', colaboradorId)
    .single();

  if (colaborError) {
    if (colaborError.code === 'PGRST116') return null;
    throw colaborError;
  }

  const { data: vinculos, error: vinculosError } = await supabase
    .from('atividades_mao_obra_colaboradores')
    .select('atividade_id, custo_colaborador, atividades_mao_obra(data)')
    .eq('colaborador_id', colaboradorId);

  if (vinculosError) throw vinculosError;

  const rows = (vinculos ?? []) as unknown as Array<{
    atividade_id: string;
    custo_colaborador: number;
    atividades_mao_obra: { data: string } | null;
  }>;

  const total_atividades = rows.length;

  const primeiroDiaMes = new Date();
  primeiroDiaMes.setDate(1);
  const primeiroDiaMesStr = primeiroDiaMes.toISOString().split('T')[0];

  const custo_mes_atual = rows.reduce((acc, row) => {
    const data = row.atividades_mao_obra?.data ?? '';
    if (data >= primeiroDiaMesStr) {
      return acc + Number(row.custo_colaborador);
    }
    return acc;
  }, 0);

  const ultima_atividade =
    rows.length > 0
      ? rows
          .map((r) => r.atividades_mao_obra?.data ?? '')
          .filter(Boolean)
          .sort()
          .reverse()[0] ?? null
      : null;

  return {
    ...(colab as unknown as Colaborador),
    total_atividades,
    ultima_atividade,
    custo_mes_atual,
  };
}

export async function hasAtividades(
  supabase: SupabaseClient<Database>,
  colaboradorId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('atividades_mao_obra_colaboradores')
    .select('id')
    .eq('colaborador_id', colaboradorId)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function hasAtividadesFuturas(
  supabase: SupabaseClient<Database>,
  colaboradorId: string,
): Promise<boolean> {
  const hoje = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('atividades_mao_obra_colaboradores')
    .select('atividade_id, atividades_mao_obra!inner(data)')
    .eq('colaborador_id', colaboradorId)
    .gt('atividades_mao_obra.data', hoje)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

// ─── Atividades ───────────────────────────────────────────────────────────────

export async function listAtividades(
  supabase: SupabaseClient<Database>,
  filtros: FiltrosAtividade = {},
): Promise<AtividadeComColaboradores[]> {
  // Buscar atividades com joins de vínculo
  let query = supabase
    .from('atividades_mao_obra')
    .select(`
      ${ATIVIDADE_COLS},
      talhoes(nome),
      silos(nome),
      maquinas(nome)
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (filtros.tipo_atividade) {
    query = query.eq('tipo_atividade', filtros.tipo_atividade);
  }
  if (filtros.data_inicio) {
    query = query.gte('data', filtros.data_inicio);
  }
  if (filtros.data_fim) {
    query = query.lte('data', filtros.data_fim);
  }
  if (filtros.vinculo === 'talhao') {
    query = query.not('talhao_id', 'is', null);
  } else if (filtros.vinculo === 'silo') {
    query = query.not('silo_id', 'is', null);
  } else if (filtros.vinculo === 'maquina') {
    query = query.not('maquina_id', 'is', null);
  } else if (filtros.vinculo === 'nenhum') {
    query = query
      .is('talhao_id', null)
      .is('silo_id', null)
      .is('maquina_id', null);
  }

  const { data: atividadesRaw, error: atividadesError } = await query;
  if (atividadesError) throw atividadesError;

  if (!atividadesRaw || atividadesRaw.length === 0) return [];

  const atividadeIds = atividadesRaw.map((a) => a.id);

  // Buscar colaboradores vinculados
  let vinculosQuery = supabase
    .from('atividades_mao_obra_colaboradores')
    .select(`
      ${ATIVIDADE_COLAB_COLS},
      colaboradores(nome, funcao)
    `)
    .in('atividade_id', atividadeIds);

  if (filtros.colaborador_id) {
    vinculosQuery = vinculosQuery.eq('colaborador_id', filtros.colaborador_id);
  }

  const { data: vinculosRaw, error: vinculosError } = await vinculosQuery;
  if (vinculosError) throw vinculosError;

  type VinculoRow = {
    id: string;
    atividade_id: string;
    colaborador_id: string;
    custo_colaborador: number;
    colaboradores: { nome: string; funcao: string } | null;
  };

  const vinculosPorAtividade = new Map<string, ColaboradorResumido[]>();
  for (const v of (vinculosRaw ?? []) as unknown as VinculoRow[]) {
    if (!vinculosPorAtividade.has(v.atividade_id)) {
      vinculosPorAtividade.set(v.atividade_id, []);
    }
    vinculosPorAtividade.get(v.atividade_id)!.push({
      id: v.colaborador_id,
      nome: v.colaboradores?.nome ?? '',
      funcao: (v.colaboradores?.funcao ?? 'Outros') as FuncaoColaborador,
      custo_colaborador: Number(v.custo_colaborador),
    });
  }

  // Se filtrou por colaborador, manter apenas atividades com vínculo
  let atividades = atividadesRaw;
  if (filtros.colaborador_id) {
    const idsComVinculo = new Set(vinculosPorAtividade.keys());
    atividades = atividadesRaw.filter((a) => idsComVinculo.has(a.id));
  }

  return atividades.map((row) => {
    // joins many-to-one: SDK infere array, mas são objetos únicos
    const r = row as unknown as typeof row & {
      talhoes: { nome: string } | null;
      silos: { nome: string } | null;
      maquinas: { nome: string } | null;
    };

    return {
      id: r.id,
      fazenda_id: r.fazenda_id,
      data: r.data,
      tipo_atividade: r.tipo_atividade as TipoAtividade,
      duracao_tipo: r.duracao_tipo as AtividadeMaoObra['duracao_tipo'],
      duracao_valor: Number(r.duracao_valor),
      custo_calculado: Number(r.custo_calculado),
      custo_manual: r.custo_manual !== null ? Number(r.custo_manual) : null,
      custo_final: Number(r.custo_final ?? r.custo_calculado),
      talhao_id: r.talhao_id,
      silo_id: r.silo_id,
      maquina_id: r.maquina_id,
      observacoes: r.observacoes,
      despesa_id: r.despesa_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      colaboradores: vinculosPorAtividade.get(r.id) ?? [],
      talhao_nome: r.talhoes?.nome ?? null,
      silo_nome: r.silos?.nome ?? null,
      maquina_nome: r.maquinas?.nome ?? null,
    } satisfies AtividadeComColaboradores;
  });
}

export async function getAtividadeById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<AtividadeMaoObra | null> {
  const { data, error } = await supabase
    .from('atividades_mao_obra')
    .select(ATIVIDADE_COLS)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as AtividadeMaoObra;
}

export async function listColaboradoresDaAtividade(
  supabase: SupabaseClient<Database>,
  atividadeId: string,
): Promise<AtividadeMaoObraColaborador[]> {
  const { data, error } = await supabase
    .from('atividades_mao_obra_colaboradores')
    .select(ATIVIDADE_COLAB_COLS)
    .eq('atividade_id', atividadeId);

  if (error) throw error;
  return (data ?? []) as unknown as AtividadeMaoObraColaborador[];
}

// ─── KPIs mensais ─────────────────────────────────────────────────────────────

export async function getKpisMensais(
  supabase: SupabaseClient<Database>,
): Promise<KpisMaoObra> {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // 1. Custo total e contagem do mês
  const { data: totais, error: totaisError } = await supabase
    .from('atividades_mao_obra')
    .select('id, custo_final')
    .gte('data', primeiroDiaMes);

  if (totaisError) throw totaisError;

  const rows = (totais ?? []) as unknown as Array<{ id: string; custo_final: number | null }>;
  const custo_total_mes = rows.reduce((acc, r) => acc + Number(r.custo_final ?? 0), 0);
  const qtd_atividades_mes = rows.length;

  // 2. Colaborador destaque (maior quantidade de atividades no mês)
  const atividadeIds = rows.map((r) => r.id);

  let colaborador_destaque: KpisMaoObra['colaborador_destaque'] = null;

  if (atividadeIds.length > 0) {
    const { data: vinculosMes, error: vinculosError } = await supabase
      .from('atividades_mao_obra_colaboradores')
      .select('colaborador_id, colaboradores(nome)')
      .in('atividade_id', atividadeIds);

    if (vinculosError) throw vinculosError;

    type VinculoKpi = { colaborador_id: string; colaboradores: { nome: string } | null };
    const contagemPorColab = new Map<string, { nome: string; count: number }>();

    for (const v of (vinculosMes ?? []) as unknown as VinculoKpi[]) {
      const existing = contagemPorColab.get(v.colaborador_id);
      if (existing) {
        existing.count++;
      } else {
        contagemPorColab.set(v.colaborador_id, {
          nome: v.colaboradores?.nome ?? '',
          count: 1,
        });
      }
    }

    if (contagemPorColab.size > 0) {
      const destaque = [...contagemPorColab.values()].sort((a, b) => b.count - a.count)[0];
      colaborador_destaque = { nome: destaque.nome, qtd_atividades: destaque.count };
    }
  }

  // 3. Top 3 tipos de atividade por custo no mês
  const { data: atividadesMes, error: tiposError } = await supabase
    .from('atividades_mao_obra')
    .select('tipo_atividade, custo_final')
    .gte('data', primeiroDiaMes);

  if (tiposError) throw tiposError;

  type AtividadeTipo = { tipo_atividade: string; custo_final: number | null };
  const custoPorTipo = new Map<string, number>();

  for (const a of (atividadesMes ?? []) as unknown as AtividadeTipo[]) {
    const custo = Number(a.custo_final ?? 0);
    custoPorTipo.set(a.tipo_atividade, (custoPorTipo.get(a.tipo_atividade) ?? 0) + custo);
  }

  const top3_tipos = [...custoPorTipo.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([tipo, custo_total]) => ({
      tipo: tipo as TipoAtividade,
      custo_total,
    }));

  return {
    custo_total_mes,
    qtd_atividades_mes,
    colaborador_destaque,
    top3_tipos,
  };
}

// ─── Standalone (para uso em Server Components sem passar supabase) ───────────

export async function listColaboradoresServer(
  filtros: FiltrosColaborador = {},
): Promise<Colaborador[]> {
  const supabase = await createSupabaseServerClient();
  return listColaboradores(supabase, filtros);
}

export async function listAtividadesServer(
  filtros: FiltrosAtividade = {},
): Promise<AtividadeComColaboradores[]> {
  const supabase = await createSupabaseServerClient();
  return listAtividades(supabase, filtros);
}

export async function getKpisMensaisServer(): Promise<KpisMaoObra> {
  const supabase = await createSupabaseServerClient();
  return getKpisMensais(supabase);
}
