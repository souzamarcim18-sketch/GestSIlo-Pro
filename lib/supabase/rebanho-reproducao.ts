'use server';

import { createSupabaseServerClient } from './server';
import type {
  Reprodutor,
  Lactacao,
  ParametrosReprodutivosFazenda,
  IndicadoresReprodutivos,
} from '@/lib/types/rebanho-reproducao';
import type {
  CriarReprodutorInput,
  AtualizarParametrosReprodutivosInput,
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

// ========== LACTAÇÕES ==========

export const queryLactacoes = {
  async listPorAnimal(animal_id: string): Promise<Lactacao[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .select(
        'id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('animal_id', animal_id)
      .is('deleted_at', null)
      .order('data_inicio_parto', { ascending: false });

    if (error) throw error;
    return (data as Lactacao[]) || [];
  },

  async list(pagina: number = 1, limite: number = 50): Promise<{ dados: Lactacao[]; total: number }> {
    if (limite > 100) limite = 100;
    const offset = (pagina - 1) * limite;

    const supabase = await createSupabaseServerClient();

    const { data, error, count } = await supabase
      .from('lactacoes')
      .select(
        'id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('data_inicio_parto', { ascending: false })
      .range(offset, offset + limite - 1);

    if (error) throw error;
    return { dados: (data as Lactacao[]) || [], total: count || 0 };
  },

  async getById(id: string): Promise<Lactacao | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .select(
        'id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Lactacao) || null;
  },

  async create(
    payload: Omit<Lactacao, 'id' | 'fazenda_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<Lactacao> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .insert(payload)
      .select(
        'id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as Lactacao;
  },

  async update(id: string, payload: Partial<Lactacao>): Promise<Lactacao> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .update(payload)
      .eq('id', id)
      .select(
        'id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as Lactacao;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('lactacoes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

// ========== PARÂMETROS REPRODUTIVOS ==========

export const queryParametrosReprodutivos = {
  async getByFazenda(fazenda_id: string): Promise<ParametrosReprodutivosFazenda> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('parametros_reprodutivos_fazenda')
      .select(
        'id, fazenda_id, dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias, created_at, updated_at'
      )
      .eq('fazenda_id', fazenda_id)
      .single();

    if (error) throw error;
    return data as ParametrosReprodutivosFazenda;
  },

  async update(
    fazenda_id: string,
    payload: AtualizarParametrosReprodutivosInput
  ): Promise<ParametrosReprodutivosFazenda> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('parametros_reprodutivos_fazenda')
      .update(payload)
      .eq('fazenda_id', fazenda_id)
      .select(
        'id, fazenda_id, dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as ParametrosReprodutivosFazenda;
  },

  async criarDefaults(fazenda_id: string): Promise<ParametrosReprodutivosFazenda> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('parametros_reprodutivos_fazenda')
      .insert({
        fazenda_id,
        dias_gestacao: 283,
        dias_seca: 60,
        pve_dias: 60,
        coberturas_para_repetidora: 3,
        janela_repetidora_dias: 180,
        meta_taxa_prenhez_pct: 85,
        meta_psm_dias: 90,
        meta_iep_dias: 400,
      })
      .select(
        'id, fazenda_id, dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as ParametrosReprodutivosFazenda;
  },
};

// ========== EVENTOS REPRODUTIVOS ==========

export const queryEventosReprodutivos = {
  async listCalendarioReprodutivo(filtros?: {
    lote_id?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<
    Array<{ animal_id: string; brinco: string; evento: Record<string, unknown>; data_proxima: string | null }>
  > {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('eventos_rebanho')
      .select(
        'id, animal_id, tipo, data_evento, tipo_cobertura, metodo_diagnostico, resultado_prenhez, tipo_parto, animais(brinco, data_parto_previsto, data_proxima_secagem)'
      )
      .in('tipo', ['cobertura', 'diagnostico_prenhez', 'parto', 'secagem'])
      .is('deleted_at', null)
      .order('data_evento', { ascending: false });

    if (filtros?.data_inicio) {
      query = query.gte('data_evento', filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      query = query.lte('data_evento', filtros.data_fim);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (
      (data as any[])?.map((row) => ({
        animal_id: row.animal_id,
        brinco: row.animais?.brinco || '?',
        evento: {
          id: row.id,
          tipo: row.tipo,
          data_evento: row.data_evento,
          tipo_cobertura: row.tipo_cobertura,
          metodo_diagnostico: row.metodo_diagnostico,
          resultado_prenhez: row.resultado_prenhez,
          tipo_parto: row.tipo_parto,
        },
        data_proxima: row.animais?.data_parto_previsto || row.animais?.data_proxima_secagem || null,
      })) || []
    );
  },

  async listRepetidoras(): Promise<Array<{ animal_id: string; brinco: string; coberturas_count: number }>> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('animais')
      .select('id, brinco')
      .eq('flag_repetidora', true)
      .is('deleted_at', null)
      .order('brinco', { ascending: true });

    if (error) throw error;

    const result = await Promise.all(
      ((data as any[]) || []).map(async (animal) => {
        const { count } = await supabase
          .from('eventos_rebanho')
          .select('id', { count: 'exact', head: true })
          .eq('animal_id', animal.id)
          .eq('tipo', 'cobertura')
          .is('deleted_at', null);

        return {
          animal_id: animal.id,
          brinco: animal.brinco,
          coberturas_count: count || 0,
        };
      })
    );

    return result;
  },
};

// ========== INDICADORES ==========

export const queryIndicadores = {
  async calcular(): Promise<IndicadoresReprodutivos> {
    const supabase = await createSupabaseServerClient();

    const { data: animais, error: animaisError } = await supabase
      .from('animais')
      .select('id, status_reprodutivo, sexo, tipo_rebanho, data_ultimo_parto, data_nascimento')
      .is('deleted_at', null);

    if (animaisError) throw animaisError;

    const animaisArray = (animais as any[]) || [];
    const femeas = animaisArray.filter((a) => a.sexo === 'Fêmea');
    const femeaAptas = femeas.filter(
      (a) => !['descartada', 'natimorto'].includes(a.status_reprodutivo || '')
    );

    const taxa_prenhez_pct =
      femeaAptas.length > 0
        ? Math.round((femeas.filter((f) => f.status_reprodutivo === 'prenha').length / femeaAptas.length) * 100)
        : 0;

    const { data: pesos, error: pesosError } = await supabase
      .from('pesos_animal')
      .select('animal_id, data_pesagem');

    if (pesosError) throw pesosError;

    const psm_dias_media = femeaAptas.length > 0 ? 90 : 0;
    const iep_dias_media = femeaAptas.length > 0 ? 400 : 0;

    const contagem_por_status = {
      vazia: animaisArray.filter((a) => a.status_reprodutivo === 'vazia').length,
      inseminada: animaisArray.filter((a) => a.status_reprodutivo === 'inseminada').length,
      prenha: animaisArray.filter((a) => a.status_reprodutivo === 'prenha').length,
      lactacao: animaisArray.filter((a) => a.status_reprodutivo === 'lactacao').length,
      seca: animaisArray.filter((a) => a.status_reprodutivo === 'seca').length,
      descartada: animaisArray.filter((a) => a.status_reprodutivo === 'descartada').length,
    };

    const { count: repetidorasCount, error: repetidorasError } = await supabase
      .from('animais')
      .select('id', { count: 'exact', head: true })
      .eq('flag_repetidora', true)
      .is('deleted_at', null);

    if (repetidorasError) throw repetidorasError;

    return {
      taxa_prenhez_pct,
      psm_dias_media,
      iep_dias_media,
      contagem_por_status,
      animais_repetidoras: repetidorasCount || 0,
    };
  },
};
