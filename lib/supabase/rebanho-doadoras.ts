import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Doadora } from '@/lib/types/rebanho-doadoras';
import type { EspecieRebanho } from '@/lib/types/rebanho-reproducao';
import type { CriarDoadoraInput } from '@/lib/validations/rebanho-reproducao';

const COLUNAS =
  'id, fazenda_id, animal_id, origem, tipo_rebanho, nome, raca, numero_registro, data_entrada, observacoes, deleted_at, created_at, updated_at';

/**
 * Queries de doadoras — espelha o padrão de queryReprodutores. Filtra por
 * tipo_rebanho quando informado; `dupla_aptidao` aparece em ambos os painéis
 * porque as páginas de espécie passam ['leiteiro','dupla_aptidao'] etc.
 */
export const queryDoadoras = {
  /**
   * Lista doadoras da fazenda. Se `especies` for informado, filtra por elas
   * (ex.: ['leiteiro','dupla_aptidao'] no painel de leite).
   */
  async list(especies?: EspecieRebanho[]): Promise<Doadora[]> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('doadoras')
      .select(COLUNAS)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (especies && especies.length > 0) {
      query = query.in('tipo_rebanho', especies);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Doadora[]) || [];
  },

  async getById(id: string): Promise<Doadora | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('doadoras')
      .select(COLUNAS)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Doadora) || null;
  },

  async create(payload: CriarDoadoraInput): Promise<Doadora> {
    const supabase = await createSupabaseServerClient();

    // fazenda_id nunca enviado — trigger set_fazenda_id preenche.
    const { data, error } = await supabase
      .from('doadoras')
      .insert({
        nome: payload.nome,
        origem: payload.origem,
        tipo_rebanho: payload.tipo_rebanho,
        animal_id: payload.animal_id ?? null,
        raca: payload.raca ?? null,
        numero_registro: payload.numero_registro ?? null,
        data_entrada: payload.data_entrada ?? null,
        observacoes: payload.observacoes ?? null,
      })
      .select(COLUNAS)
      .single();

    if (error) throw error;
    return data as Doadora;
  },

  async update(id: string, payload: Partial<CriarDoadoraInput>): Promise<Doadora> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('doadoras')
      .update(payload)
      .eq('id', id)
      .select(COLUNAS)
      .single();

    if (error) throw error;
    return data as Doadora;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('doadoras')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
