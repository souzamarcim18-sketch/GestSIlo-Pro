'use server';

import { createSupabaseServerClient } from './server';
import type {
  Reprodutor,
  // TODO: Lactacao, ParametrosReprodutivosFazenda, IndicadoresReprodutivos (Fase 2 T5+)
} from '@/lib/types/rebanho-reproducao';
import type {
  CriarReprodutorInput,
  // TODO: AtualizarParametrosReprodutivosInput (Fase 2 T5+)
} from '@/lib/validations/rebanho-reproducao';

// ========== REPRODUTORES ==========

export const queryReprodutores = {
  async list(pagina: number = 1, limite: number = 50): Promise<{ dados: Reprodutor[]; total: number }> {
    if (limite > 100) limite = 100;
    const offset = (pagina - 1) * limite;

    const supabase = await createSupabaseServerClient();

    const { data, error, count } = await supabase
      .from('reprodutores')
      .select(
        'id, fazenda_id, nome, tipo, raca, numero_registro, data_entrada, observacoes, deleted_at, created_at, updated_at',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1);

    if (error) throw error;
    return { dados: (data as Reprodutor[]) || [], total: count || 0 };
  },

  async getById(id: string): Promise<Reprodutor | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('reprodutores')
      .select(
        'id, fazenda_id, nome, tipo, raca, numero_registro, data_entrada, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Reprodutor) || null;
  },

  async create(payload: CriarReprodutorInput): Promise<Reprodutor> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('reprodutores')
      .insert({
        ...payload,
      })
      .select(
        'id, fazenda_id, nome, tipo, raca, numero_registro, data_entrada, observacoes, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as Reprodutor;
  },

  async update(id: string, payload: Partial<CriarReprodutorInput>): Promise<Reprodutor> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('reprodutores')
      .update(payload)
      .eq('id', id)
      .select(
        'id, fazenda_id, nome, tipo, raca, numero_registro, data_entrada, observacoes, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as Reprodutor;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('reprodutores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async getByNumeroRegistro(numero_registro: string): Promise<Reprodutor | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('reprodutores')
      .select(
        'id, fazenda_id, nome, tipo, raca, numero_registro, data_entrada, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('numero_registro', numero_registro)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Reprodutor) || null;
  },
};

// ========== PARÂMETROS REPRODUTIVOS ==========

export const queryParametrosReprodutivos = {
  async update(fazenda_id: string, payload: any): Promise<void> {
    const supabase = await createSupabaseServerClient();
    // TODO: Implementar após ter migrations de parametros
    return;
  },
};

// TODO: Adicionar queryLactacoes, queryEventosReprodutivos após Fase 2 T5+
