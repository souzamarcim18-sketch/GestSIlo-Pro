'use server';

import { createSupabaseServerClient } from './server';
import { getCurrentUserId, getCurrentFazendaId } from '@/lib/auth/helpers';
import type { ProducaoLeiteira, ProducaoLeiteiraInput } from '@/lib/types/rebanho-leiteira';
import { calcularKpisLeiteiros, type KpisLeiteiros } from '@/lib/calculos/indicadores-rebanho';
import type { Animal } from '@/lib/types/rebanho';

// ========== CRIAR PRODUÇÃO LEITEIRA ==========

export async function criarProducaoLeiteira(
  payload: ProducaoLeiteiraInput
): Promise<ProducaoLeiteira> {
  const supabase = await createSupabaseServerClient();
  const usuarioId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('producoes_leiteiras')
    .insert({
      ...payload,
      usuario_id: usuarioId,
    })
    .select(
      'id, fazenda_id, animal_id, data, turno, volume_litros, ccs_mil_cel_ml, observacoes, usuario_id, created_at'
    )
    .single();

  if (error) throw error;
  return data as ProducaoLeiteira;
}

// ========== LISTAR POR ANIMAL ==========

export async function listProducoesLeiteiras(
  animalId: string,
  limit: number = 30,
  offset: number = 0
): Promise<ProducaoLeiteira[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('producoes_leiteiras')
    .select(
      'id, fazenda_id, animal_id, data, turno, volume_litros, ccs_mil_cel_ml, observacoes, usuario_id, created_at'
    )
    .eq('animal_id', animalId)
    .order('data', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data as ProducaoLeiteira[]) || [];
}

// ========== LISTAR POR PERÍODO COM DADOS DO ANIMAL ==========

export async function listProducoesLeiteirasNoPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<
  Array<
    ProducaoLeiteira & {
      animal_brinco: string;
      animal_nome: string | null;
      animal_status_reprodutivo: string | null;
      animal_lote_id: string | null;
    }
  >
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('producoes_leiteiras')
    .select(
      `id, fazenda_id, animal_id, data, turno, volume_litros, ccs_mil_cel_ml, observacoes, usuario_id, created_at,
       animais:animal_id(brinco, nome, status_reprodutivo, lote_id)`
    )
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false });

  if (error) throw error;

  type ProducaoRow = ProducaoLeiteira & { animais?: { brinco?: string; nome?: string | null; status_reprodutivo?: string | null; lote_id?: string | null } | null };
  const rows = (data || []) as unknown as ProducaoRow[];
  return rows.map((row) => ({
    id: row.id,
    fazenda_id: row.fazenda_id,
    animal_id: row.animal_id,
    data: row.data,
    turno: row.turno,
    volume_litros: row.volume_litros,
    observacoes: row.observacoes,
    usuario_id: row.usuario_id,
    created_at: row.created_at,
    animal_brinco: row.animais?.brinco || '',
    animal_nome: row.animais?.nome || null,
    animal_status_reprodutivo: row.animais?.status_reprodutivo || null,
    animal_lote_id: row.animais?.lote_id || null,
  }));
}

// ========== TOTAL POR PERÍODO ==========

export async function totalProducaoLeiteiraPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<{
  total_litros: number;
  por_animal: Array<{
    animal_id: string;
    brinco: string;
    nome: string | null;
    total_litros: number;
  }>;
}> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('producoes_leiteiras')
    .select(
      `animal_id, volume_litros,
       animais:animal_id(brinco, nome)`
    )
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (error) throw error;

  const porAnimal: Record<
    string,
    { brinco: string; nome: string | null; total: number }
  > = {};
  let totalLitros = 0;

  type RankingRow = { animal_id: string; volume_litros: number; animais?: { brinco?: string; nome?: string | null } | null };
  ((data || []) as unknown as RankingRow[]).forEach((row) => {
    totalLitros += row.volume_litros;
    if (!porAnimal[row.animal_id]) {
      porAnimal[row.animal_id] = {
        brinco: row.animais?.brinco || '',
        nome: row.animais?.nome || null,
        total: 0,
      };
    }
    porAnimal[row.animal_id].total += row.volume_litros;
  });

  return {
    total_litros: totalLitros,
    por_animal: Object.entries(porAnimal).map(([animalId, info]) => ({
      animal_id: animalId,
      brinco: info.brinco,
      nome: info.nome,
      total_litros: info.total,
    })),
  };
}

// ========== DEL MÉDIO (dias em lactação) das vacas ativas ==========

export async function getDELMedioAtivo(): Promise<number | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('lactacoes')
    .select('animal_id, data_inicio_parto')
    .is('data_fim_secagem', null)
    .is('deleted_at', null);

  if (error || !data || data.length === 0) return null;

  const hoje = new Date();
  const somasDias = data.map((l) => {
    const inicio = new Date(l.data_inicio_parto);
    return Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  });

  return Math.round(somasDias.reduce((a, b) => a + b, 0) / somasDias.length);
}

// ========== KPIs DO PAINEL LEITEIRO (serviço reusável — Fase 4, P4.1) ==========

/**
 * Serviço reusável dos KPIs do painel leiteiro.
 *
 * Centraliza as buscas que antes viviam inline na página de Gestão Leiteira
 * (produções no período, total do período, fêmeas leiteiras, DEL médio) e
 * delega o cálculo à função pura `calcularKpisLeiteiros`. Os números são
 * idênticos aos da página atual (D-4.1). Consumido tanto pela página de
 * Leiteira quanto pela superfície única de Indicadores do Rebanho.
 *
 * Janela padrão: últimos 30 dias (mesma da página de Leiteira). O chamador
 * pode passar um período explícito; quando omitido, usa os últimos 30 dias.
 */
export async function getKpisLeiteiros(periodo?: {
  dataInicio: string;
  dataFim: string;
}): Promise<KpisLeiteiros> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getCurrentFazendaId();

  let dataInicio: string;
  let dataFim: string;
  if (periodo) {
    dataInicio = periodo.dataInicio;
    dataFim = periodo.dataFim;
  } else {
    const hoje = new Date();
    const inicio30dias = new Date(hoje);
    inicio30dias.setDate(inicio30dias.getDate() - 30);
    dataInicio = inicio30dias.toISOString().split('T')[0];
    dataFim = hoje.toISOString().split('T')[0];
  }

  const [producoes, totais, animaisRes, delMedio] = await Promise.all([
    listProducoesLeiteirasNoPeriodo(dataInicio, dataFim),
    totalProducaoLeiteiraPeriodo(dataInicio, dataFim),
    supabase
      .from('animais')
      .select('id, status_reprodutivo, status')
      .eq('fazenda_id', fazendaId)
      .eq('sexo', 'Fêmea')
      .in('tipo_rebanho', ['leiteiro', 'dupla_aptidao'])
      .is('deleted_at', null),
    getDELMedioAtivo(),
  ]);

  const animais = (animaisRes.data ?? []) as Pick<Animal, 'status_reprodutivo' | 'status'>[];

  return calcularKpisLeiteiros({
    animais,
    producoes: producoes.map((p) => ({ data: p.data, volume_litros: p.volume_litros })),
    totalLitrosPeriodo: totais.total_litros,
    delMedioDias: delMedio,
    dataInicio,
    dataFim,
  });
}

// ========== DELETAR PRODUÇÃO ==========

export async function deletarProducaoLeiteira(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('producoes_leiteiras')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ========== EDITAR PRODUÇÃO ==========

export async function editarProducaoLeiteira(
  id: string,
  payload: Partial<Pick<ProducaoLeiteira, 'volume_litros' | 'turno' | 'observacoes'>>
): Promise<ProducaoLeiteira> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('producoes_leiteiras')
    .update(payload)
    .eq('id', id)
    .select(
      'id, fazenda_id, animal_id, data, turno, volume_litros, ccs_mil_cel_ml, observacoes, usuario_id, created_at'
    )
    .single();

  if (error) throw error;
  return data as ProducaoLeiteira;
}
