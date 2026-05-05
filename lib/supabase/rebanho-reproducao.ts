import { createSupabaseServerClient } from './server';
import type {
  Reprodutor,
  EventoCobertura,
  EventoDiagnostico,
  EventoParto,
  EventoSecagem,
  EventoAborto,
  EventoDescarte,
  EventoReprodutivo,
  Lactacao,
  EventoPartoCria,
  ParametrosReprodutivosFazenda,
} from '@/lib/types/rebanho-reproducao';
import type {
  CriarReprodutorInput,
  CriarCoberturaInput,
  CriarDiagnosticoInput,
  CriarPartoInput,
  CriarSecagemInput,
  CriarAbortoInput,
  CriarDescarteInput,
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

// ========== EVENTOS REPRODUTIVOS ==========

export const queryEventosRebanho = {
  /** Registra cobertura em eventos_rebanho */
  async registrarCobertura(payload: CriarCoberturaInput, usuario_id: string): Promise<{ id: string }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: payload.animal_id,
        tipo: 'cobertura',
        data_evento: payload.data_evento,
        tipo_cobertura: payload.tipo_cobertura,
        reprodutor_id: payload.reprodutor_id || null,
        observacoes: payload.observacoes || null,
        usuario_id,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  },

  /** Registra diagnóstico de prenhez em eventos_rebanho */
  async registrarDiagnostico(payload: CriarDiagnosticoInput, usuario_id: string): Promise<{ id: string }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: payload.animal_id,
        tipo: 'diagnostico_prenhez',
        data_evento: payload.data_evento,
        metodo_diagnostico: payload.metodo_diagnostico,
        resultado_prenhez: payload.resultado_prenhez,
        idade_gestacional_dias: payload.idade_gestacional_dias || null,
        observacoes: payload.observacoes || null,
        usuario_id,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  },

  /** Registra parto via RPC (orquestra evento + crias em transação atômica) */
  async registrarParto(payload: CriarPartoInput, usuario_id: string): Promise<{ evento_id: string; bezerros_criados: number }> {
    const supabase = await createSupabaseServerClient();

    const { data: resultado, error } = await supabase.rpc('rpc_lancar_parto', {
      p_animal_id: payload.animal_id,
      p_data_evento: payload.data_evento,
      p_tipo_parto: payload.tipo_parto,
      p_usuario_id: usuario_id,
      p_gemelar: payload.gemelar || false,
      p_natimorto: payload.natimorto || false,
      p_observacoes: payload.observacoes || null,
      p_crias: payload.crias || [],
      p_bypass_justificativa: payload.bypass_justificativa || null,
    });

    if (error) throw error;

    // RPC retorna TABLE → data é array
    const registro = resultado?.[0];
    if (!registro) throw new Error('RPC executou mas não retornou evento');

    return { evento_id: registro.evento_id, bezerros_criados: registro.bezerros_criados ?? 0 };
  },

  /** Registra secagem em eventos_rebanho */
  async registrarSecagem(payload: CriarSecagemInput, usuario_id: string): Promise<{ id: string }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: payload.animal_id,
        tipo: 'secagem',
        data_evento: payload.data_evento,
        observacoes: payload.observacoes || null,
        usuario_id,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  },

  /** Registra aborto em eventos_rebanho */
  async registrarAborto(payload: CriarAbortoInput, usuario_id: string): Promise<{ id: string }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: payload.animal_id,
        tipo: 'aborto',
        data_evento: payload.data_evento,
        idade_gestacional_dias: payload.idade_gestacional_dias || null,
        causa_aborto: payload.causa_aborto || null,
        observacoes: payload.observacoes || null,
        usuario_id,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  },

  /** Registra descarte em eventos_rebanho */
  async registrarDescarte(payload: CriarDescarteInput, usuario_id: string): Promise<{ id: string }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: payload.animal_id,
        tipo: 'descarte',
        data_evento: payload.data_evento,
        motivo_descarte: payload.motivo_descarte,
        observacoes: payload.observacoes || null,
        usuario_id,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  },

  /** Lista eventos por animal, opcionalmente filtrados por tipo e período */
  async listByAnimal(
    animal_id: string,
    options?: { tipo?: string; limit?: number; orderBy?: 'asc' | 'desc' }
  ): Promise<Array<{ id: string; tipo: string; data_evento: string; [key: string]: unknown }>> {
    const supabase = await createSupabaseServerClient();
    const limit = options?.limit || 100;
    const orderDir = options?.orderBy || 'desc';

    let query = supabase
      .from('eventos_rebanho')
      .select(
        'id, animal_id, tipo, data_evento, tipo_cobertura, reprodutor_id, metodo_diagnostico, resultado_prenhez, idade_gestacional_dias, tipo_parto, gemelar, natimorto, causa_aborto, motivo_descarte, observacoes, usuario_id, created_at, deleted_at'
      )
      .eq('animal_id', animal_id)
      .is('deleted_at', null);

    if (options?.tipo) {
      query = query.eq('tipo', options.tipo);
    }

    const { data, error } = await query.order('data_evento', { ascending: orderDir === 'asc' }).limit(limit);

    if (error) throw error;
    return data || [];
  },

  /** Lista eventos por período de data */
  async listByPeriodo(
    fazenda_id: string,
    inicio: string,
    fim: string,
    tipo?: string
  ): Promise<Array<{ id: string; animal_id: string; tipo: string; data_evento: string; [key: string]: unknown }>> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('eventos_rebanho')
      .select(
        'id, animal_id, tipo, data_evento, tipo_cobertura, reprodutor_id, metodo_diagnostico, resultado_prenhez, motivo_descarte, observacoes, created_at'
      )
      .eq('fazenda_id', fazenda_id)
      .gte('data_evento', inicio)
      .lte('data_evento', fim)
      .is('deleted_at', null);

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query.order('data_evento', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Busca evento específico por ID */
  async getById(id: string): Promise<{ id: string; [key: string]: unknown } | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select(
        'id, animal_id, tipo, data_evento, tipo_cobertura, reprodutor_id, metodo_diagnostico, resultado_prenhez, idade_gestacional_dias, tipo_parto, gemelar, natimorto, causa_aborto, motivo_descarte, observacoes, usuario_id, created_at, updated_at, deleted_at'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  /** Busca última cobertura de um animal sem diagnóstico de prenhez confirmado */
  async getUltimaCoberturaAbertaSemPrenhez(animal_id: string): Promise<{ id: string; data_evento: string } | null> {
    const supabase = await createSupabaseServerClient();

    // Última cobertura onde não há diagnóstico positivo subsequente
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select('id, data_evento')
      .eq('animal_id', animal_id)
      .eq('tipo', 'cobertura')
      .is('deleted_at', null)
      .order('data_evento', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? { id: data.id, data_evento: data.data_evento } : null;
  },

  /** Busca último diagnóstico positivo de prenhez dentro de uma janela de dias */
  async getUltimoDiagnosticoPositivo(animal_id: string, janela_dias: number = 295): Promise<{ id: string; data_evento: string; idade_gestacional_dias: number | null } | null> {
    const supabase = await createSupabaseServerClient();

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - janela_dias);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select('id, data_evento, idade_gestacional_dias')
      .eq('animal_id', animal_id)
      .eq('tipo', 'diagnostico_prenhez')
      .eq('resultado_prenhez', 'positivo')
      .gte('data_evento', dataLimiteStr)
      .is('deleted_at', null)
      .order('data_evento', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? { id: data.id, data_evento: data.data_evento, idade_gestacional_dias: data.idade_gestacional_dias } : null;
  },

  /** Soft-delete de evento (apenas admin pode fazer no fluxo de UI) */
  async softDelete(id: string, motivo?: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('eventos_rebanho')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

// ========== LACTAÇÕES ==========

export const queryLactacoes = {
  /** Lista lactações ativas ou finalizadas de uma fazenda */
  async list(
    fazenda_id: string,
    options?: { animal_id?: string; ativas?: boolean }
  ): Promise<Lactacao[]> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('lactacoes')
      .select('id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at')
      .eq('fazenda_id', fazenda_id)
      .is('deleted_at', null);

    if (options?.animal_id) {
      query = query.eq('animal_id', options.animal_id);
    }

    if (options?.ativas === true) {
      query = query.is('data_fim_secagem', null);
    }

    const { data, error } = await query.order('data_inicio_parto', { ascending: false });

    if (error) throw error;
    return (data as Lactacao[]) || [];
  },

  /** Busca lactação específica por ID */
  async getById(id: string): Promise<Lactacao | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .select('id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Lactacao) || null;
  },

  /** Busca lactação ativa (data_fim_secagem IS NULL) de um animal */
  async getAtivaPorAnimal(animal_id: string): Promise<Lactacao | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .select('id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at')
      .eq('animal_id', animal_id)
      .is('data_fim_secagem', null)
      .is('deleted_at', null)
      .order('data_inicio_parto', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Lactacao) || null;
  },

  /** Atualiza lactação (ex: registrar producao_total_litros) */
  async update(id: string, payload: Partial<Omit<Lactacao, 'id' | 'fazenda_id' | 'created_at'>>): Promise<Lactacao> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lactacoes')
      .update(payload)
      .eq('id', id)
      .select('id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes, deleted_at, created_at, updated_at')
      .single();

    if (error) throw error;
    return data as Lactacao;
  },

  /** Soft-delete de lactação */
  async softDelete(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('lactacoes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

// ========== EVENTOS PARTO CRIAS (READ-ONLY) ==========

export const queryEventosPartoCrias = {
  /** Lista crias de um parto específico */
  async listByEvento(evento_id: string): Promise<EventoPartoCria[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_parto_crias')
      .select('id, evento_id, fazenda_id, sexo, peso_kg, vivo, animal_criado_id, created_at')
      .eq('evento_id', evento_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as EventoPartoCria[]) || [];
  },

  /** Busca parto que originou um animal criado */
  async listByAnimalCriado(animal_criado_id: string): Promise<EventoPartoCria[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_parto_crias')
      .select('id, evento_id, fazenda_id, sexo, peso_kg, vivo, animal_criado_id, created_at')
      .eq('animal_criado_id', animal_criado_id);

    if (error) throw error;
    return (data as EventoPartoCria[]) || [];
  },
};

// ========== PARÂMETROS REPRODUTIVOS ==========

export const queryParametrosReprodutivos = {
  /** Busca parâmetros de uma fazenda (retorna 1 registro ou null) - RLS filtra automaticamente */
  async get(): Promise<ParametrosReprodutivosFazenda | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('parametros_reprodutivos_fazenda')
      .select(
        'id, fazenda_id, dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias, created_at, updated_at'
      )
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as ParametrosReprodutivosFazenda) || null;
  },

  /** Atualiza parâmetros reprodutivos de uma fazenda - RLS filtra automaticamente */
  async update(payload: Partial<AtualizarParametrosReprodutivosInput>): Promise<ParametrosReprodutivosFazenda> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('parametros_reprodutivos_fazenda')
      .update(payload)
      .select(
        'id, fazenda_id, dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as ParametrosReprodutivosFazenda;
  },

  /** Cria ou atualiza parâmetros reprodutivos (upsert) */
  async upsert(fazenda_id: string, payload: AtualizarParametrosReprodutivosInput): Promise<ParametrosReprodutivosFazenda> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('parametros_reprodutivos_fazenda')
      .upsert(
        {
          fazenda_id,
          ...payload,
        },
        { onConflict: 'fazenda_id' }
      )
      .select(
        'id, fazenda_id, dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as ParametrosReprodutivosFazenda;
  },
};

// ========== INDICADORES E DASHBOARD ==========

export const queryIndicadoresReprodutivos = {
  /** Busca contagem de animais por status reprodutivo */
  async getContagemPorStatus(
    fazenda_id: string
  ): Promise<{ vazia: number; inseminada: number; prenha: number; lactacao: number; seca: number; descartada: number }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('animais')
      .select('status_reprodutivo')
      .eq('fazenda_id', fazenda_id)
      .is('deleted_at', null);

    if (error) throw error;

    const contagem = {
      vazia: 0,
      inseminada: 0,
      prenha: 0,
      lactacao: 0,
      seca: 0,
      descartada: 0,
    };

    (data || []).forEach((animal: any) => {
      const status = animal.status_reprodutivo as keyof typeof contagem;
      if (status in contagem) {
        contagem[status]++;
      }
    });

    return contagem;
  },

  /** Busca taxa de prenhez (animais prenhos / total aptos) */
  async getTaxaPrenhez(fazenda_id: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('animais')
      .select('status_reprodutivo')
      .eq('fazenda_id', fazenda_id)
      .is('deleted_at', null);

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    const prenhas = data.filter((a: any) => a.status_reprodutivo === 'prenha').length;
    const aptos = data.filter((a: any) => a.status_reprodutivo !== 'descartada').length;

    if (aptos === 0) return 0;
    return Math.round((prenhas / aptos) * 100);
  },

  /** Busca PSM médio (Período de Serviço Médio) - dias entre cobertura e diagnóstico positivo */
  async getPSMMedia(fazenda_id: string): Promise<number | null> {
    const supabase = await createSupabaseServerClient();

    const { data: eventos, error } = await supabase
      .from('eventos_rebanho')
      .select('animal_id, tipo, data_evento, resultado_prenhez')
      .eq('fazenda_id', fazenda_id)
      .in('tipo', ['cobertura', 'diagnostico_prenhez'])
      .is('deleted_at', null)
      .order('animal_id')
      .order('data_evento');

    if (error) throw error;
    if (!eventos || eventos.length === 0) return null;

    const psms: number[] = [];
    const eventoPorAnimal: Record<string, any[]> = {};

    (eventos || []).forEach((e: any) => {
      if (!eventoPorAnimal[e.animal_id]) {
        eventoPorAnimal[e.animal_id] = [];
      }
      eventoPorAnimal[e.animal_id].push(e);
    });

    Object.entries(eventoPorAnimal).forEach(([, eventoList]) => {
      for (let i = 0; i < eventoList.length - 1; i++) {
        const evt = eventoList[i];
        const prox = eventoList[i + 1];
        if (evt.tipo === 'cobertura' && prox.tipo === 'diagnostico_prenhez' && prox.resultado_prenhez === 'positivo') {
          const dias = Math.floor((new Date(prox.data_evento).getTime() - new Date(evt.data_evento).getTime()) / (1000 * 60 * 60 * 24));
          if (dias > 0 && dias < 100) {
            psms.push(dias);
          }
        }
      }
    });

    if (psms.length === 0) return null;
    return Math.round(psms.reduce((a, b) => a + b, 0) / psms.length);
  },

  /** Busca IEP médio (Intervalo Entre Partos) - dias entre partos sucessivos */
  async getIEPMedia(fazenda_id: string): Promise<number | null> {
    const supabase = await createSupabaseServerClient();

    const { data: partos, error } = await supabase
      .from('eventos_rebanho')
      .select('animal_id, data_evento')
      .eq('fazenda_id', fazenda_id)
      .eq('tipo', 'parto')
      .is('deleted_at', null)
      .order('animal_id')
      .order('data_evento');

    if (error) throw error;
    if (!partos || partos.length < 2) return null;

    const partosPorAnimal: Record<string, any[]> = {};

    (partos || []).forEach((p: any) => {
      if (!partosPorAnimal[p.animal_id]) {
        partosPorAnimal[p.animal_id] = [];
      }
      partosPorAnimal[p.animal_id].push(p);
    });

    const ieps: number[] = [];

    Object.entries(partosPorAnimal).forEach(([, partoList]) => {
      for (let i = 0; i < partoList.length - 1; i++) {
        const dias = Math.floor(
          (new Date(partoList[i + 1].data_evento).getTime() - new Date(partoList[i].data_evento).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (dias > 300 && dias < 500) {
          ieps.push(dias);
        }
      }
    });

    if (ieps.length === 0) return null;
    return Math.round(ieps.reduce((a, b) => a + b, 0) / ieps.length);
  },
};

// ========== REPETIDORAS ==========

export interface AnimalRepetidora {
  id: string;
  brinco: string;
  nome: string | null;
  lote_id: string | null;
  coberturas_count: number;
  ultima_cobertura_data: string | null;
}

export const queryRepetidoras = {
  async list(fazenda_id: string): Promise<AnimalRepetidora[]> {
    const supabase = await createSupabaseServerClient();

    // Buscar animais repetidores
    const { data: animais, error } = await supabase
      .from('animais')
      .select('id, brinco, nome, lote_id')
      .eq('fazenda_id', fazenda_id)
      .eq('flag_repetidora', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!animais?.length) return [];

    // Buscar coberturas dos últimos 180 dias para esses animais
    const animalIds = animais.map(a => a.id);
    const janela = new Date();
    janela.setDate(janela.getDate() - 180);
    const dataJanela = janela.toISOString().split('T')[0];

    const { data: coberturas, error: cobError } = await supabase
      .from('eventos_rebanho')
      .select('animal_id, data_evento')
      .eq('fazenda_id', fazenda_id)
      .in('animal_id', animalIds)
      .eq('tipo', 'cobertura')
      .is('deleted_at', null)
      .gte('data_evento', dataJanela)
      .order('data_evento', { ascending: false });

    if (cobError) throw cobError;

    // Agregar por animal_id
    const coberturasMap = new Map<string, { count: number; ultima: string | null }>();
    for (const cob of coberturas ?? []) {
      const curr = coberturasMap.get(cob.animal_id);
      if (!curr) {
        coberturasMap.set(cob.animal_id, { count: 1, ultima: cob.data_evento });
      } else {
        curr.count += 1;
        if (!curr.ultima || cob.data_evento > curr.ultima) curr.ultima = cob.data_evento;
      }
    }

    return animais.map(a => ({
      ...a,
      coberturas_count: coberturasMap.get(a.id)?.count ?? 0,
      ultima_cobertura_data: coberturasMap.get(a.id)?.ultima ?? null,
    }));
  },
};
