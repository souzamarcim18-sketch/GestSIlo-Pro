'use server';

import { createSupabaseServerClient } from './server';
import type { Animal, EventoRebanho, PesoAnimal } from '@/lib/types/rebanho';

// Interface para alertas de animais
export interface AlertaAnimal {
  id: string;
  brinco: string;
  nome: string | null;
  categoria: string | null;
  lote_id: string | null;
  data_parto_previsto?: string | null;
}

// Tipo para período de busca (compatível com ambos os fluxos)
interface PeriodoBusca {
  data_inicial: string;
  data_final: string;
}

interface FiltroBusca {
  periodo: PeriodoBusca;
  tipo_rebanho?: string;
  lote_id?: string;
}

/**
 * Busca eventos do rebanho em um período, com filtros opcionais
 * Retorna eventos ordenados cronologicamente (ASC) para cálculo de GMD e taxas
 * RLS + get_minha_fazenda_id() garantem multi-tenancy
 */
export async function buscarEventosNoPeriodo(
  filtro: FiltroBusca
): Promise<EventoRebanho[]> {
  const supabase = await createSupabaseServerClient();

  const dataInicio = filtro.periodo.data_inicial;
  const dataFim = filtro.periodo.data_final;

  let query = supabase
    .from('eventos_rebanho')
    .select(
      'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
    )
    .gte('data_evento', dataInicio)
    .lte('data_evento', dataFim)
    .is('deleted_at', null)
    .order('data_evento', { ascending: true });

  if (filtro.lote_id) {
    query = query.eq('lote_id_destino', filtro.lote_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as EventoRebanho[]) || [];
}

/**
 * Busca pesos de animais em um período
 * Retorna pesagens ordenadas cronologicamente (ASC) para cálculo de GMD
 */
export async function buscarPesosNoPeriodo(
  filtro: FiltroBusca
): Promise<PesoAnimal[]> {
  const supabase = await createSupabaseServerClient();

  const dataInicio = filtro.periodo.data_inicial;
  const dataFim = filtro.periodo.data_final;

  let query = supabase
    .from('pesos_animal')
    .select(
      'id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes, created_at'
    )
    .gte('data_pesagem', dataInicio)
    .lte('data_pesagem', dataFim)
    .order('data_pesagem', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return (data as PesoAnimal[]) || [];
}

/**
 * Busca animais ativos da fazenda, com filtros opcionais por lote e tipo
 * RLS garante que apenas animais da fazenda sejam retornados
 */
export async function buscarAnimaisFiltrados(
  filtro: FiltroBusca
): Promise<Animal[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('animais')
    .select(
      'id, fazenda_id, brinco, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
    )
    .is('deleted_at', null)
    .eq('status', 'Ativo');

  if (filtro.lote_id) {
    query = query.eq('lote_id', filtro.lote_id);
  }

  if (filtro.tipo_rebanho) {
    query = query.eq('tipo_rebanho', filtro.tipo_rebanho);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as Animal[]) || [];
}

/**
 * Busca todos os eventos de parto para cálculo de taxas reprodutivas
 * Usado para IEP e IPP
 */
export async function buscarEventosPartos(): Promise<EventoRebanho[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .select(
      'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, observacoes, created_at, updated_at'
    )
    .eq('tipo', 'parto')
    .is('deleted_at', null)
    .order('data_evento', { ascending: true });

  if (error) throw error;
  return (data as EventoRebanho[]) || [];
}

/**
 * Busca animais com parto previsto nos próximos N dias
 * Útil para alertas de parto próximo
 */
export async function listAnimaisComPartoPrevisto(
  dias: number = 30
): Promise<AlertaAnimal[]> {
  const supabase = await createSupabaseServerClient();

  const dataHoje = new Date().toISOString().split('T')[0];
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + dias);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('animais')
    .select(
      'id, brinco, nome, categoria, data_parto_previsto, lote_id'
    )
    .eq('status', 'Ativo')
    .is('deleted_at', null)
    .gte('data_parto_previsto', dataHoje)
    .lte('data_parto_previsto', dataLimiteStr)
    .order('data_parto_previsto', { ascending: true });

  if (error) throw error;
  return (data as AlertaAnimal[]) || [];
}

/**
 * Busca vacas secas com parto previsto nos próximos N dias
 * Subset do alerta anterior, filtrado por categoria
 */
export async function listVacasSecasComPartoPrevisto(
  dias: number = 15
): Promise<AlertaAnimal[]> {
  const supabase = await createSupabaseServerClient();

  const dataHoje = new Date().toISOString().split('T')[0];
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + dias);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('animais')
    .select(
      'id, brinco, nome, categoria, data_parto_previsto, lote_id'
    )
    .eq('status', 'Ativo')
    .is('deleted_at', null)
    .in('categoria', ['Vaca Seca', 'Vaca seca'])
    .gte('data_parto_previsto', dataHoje)
    .lte('data_parto_previsto', dataLimiteStr)
    .order('data_parto_previsto', { ascending: true });

  if (error) throw error;
  return (data as AlertaAnimal[]) || [];
}

/**
 * Busca animais sem pesagem há N+ dias
 * Útil para alertas de monitoramento de peso
 */
export async function listAnimaisSemPesagem(
  dias: number = 60
): Promise<AlertaAnimal[]> {
  const supabase = await createSupabaseServerClient();

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  // Passo 1: Buscar IDs de animais com pesagem recente
  const { data: pesagensRecentes, error: pesagemError } = await supabase
    .from('pesos_animal')
    .select('animal_id', { count: 'exact' })
    .gte('data_pesagem', dataLimiteStr);

  if (pesagemError) throw pesagemError;

  const idsComPesagem = (pesagensRecentes || []).map(p => p.animal_id);

  // Passo 2: Buscar animais ativos que NÃO estão no passo 1
  let query = supabase
    .from('animais')
    .select(
      'id, brinco, nome, categoria, lote_id'
    )
    .eq('status', 'Ativo')
    .is('deleted_at', null);

  if (idsComPesagem.length > 0) {
    query = query.not('id', 'in', `(${idsComPesagem.join(',')})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as AlertaAnimal[]) || [];
}
