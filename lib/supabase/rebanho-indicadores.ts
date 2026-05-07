'use server';

import { createSupabaseServerClient } from './server';
import type { Animal, EventoRebanho, PesoAnimal } from '@/lib/types/rebanho';

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
