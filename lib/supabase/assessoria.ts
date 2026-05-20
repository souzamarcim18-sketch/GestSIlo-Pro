import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  AnotacaoAssessoria,
  HorarioDisponivel,
  AgendamentoUsuario,
  HistoricoAtendimento,
} from '@/lib/types/assessoria';
import {
  AnotacaoFormInput,
  CriarAgendamentoInput,
  AtualizarStatusAgendamentoInput,
  HistoricoAtendimentoInput,
} from '@/lib/validations/assessoria';

const getClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
};

// ============================================================
// ANOTAÇÕES
// ============================================================

export const queryAnotacoes = {
  async list(fazendaId: string, filters?: any) {
    const client = await getClient();
    let query = client
      .from('anotacoes_assessoria')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.categoria) query = query.eq('categoria', filters.categoria);
    if (filters?.prioridade) query = query.eq('prioridade', filters.prioridade);
    if (filters?.resolvida !== undefined) query = query.eq('resolvida', filters.resolvida);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AnotacaoAssessoria[];
  },

  async getById(id: string) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },

  async create(fazendaId: string, payload: AnotacaoFormInput) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .insert({ fazenda_id: fazendaId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },

  async update(id: string, payload: Partial<AnotacaoFormInput>) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },

  async delete(id: string) {
    const client = await getClient();

    console.log('[queryAnotacoes.delete] Iniciando deleção de:', id);

    // Hard delete ao invés de soft delete
    const { error } = await client
      .from('anotacoes_assessoria')
      .delete()
      .eq('id', id);

    console.log('[queryAnotacoes.delete] Delete resultado:', { error });

    if (error) {
      console.error('[queryAnotacoes.delete] Erro ao deletar:', error);
      throw new Error(`Erro ao deletar: ${error.message}`);
    }
  },

  async marcarResolvida(id: string, payload: any) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .update({
        resolvida: payload.resolvida,
        data_resolvida: payload.resolvida ? new Date().toISOString() : null,
        assessor_resposta: payload.assessor_resposta || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },
};

// ============================================================
// HORÁRIOS DISPONÍVEIS DO CONSULTOR
// ============================================================

export const queryHorarios = {
  async listDisponiveis(consultorId?: string) {
    const client = await getClient();
    let query = client
      .from('horarios_disponiveis_consultor')
      .select('*')
      .eq('disponivel', true)
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true });

    if (consultorId) {
      query = query.eq('consultor_id', consultorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HorarioDisponivel[];
  },

  async create(consultorId: string, dataHora: string, duracaoMinutos: number = 60) {
    const client = await getClient();
    const { data, error } = await client
      .from('horarios_disponiveis_consultor')
      .insert({
        consultor_id: consultorId,
        data_hora: dataHora,
        duracao_minutos: duracaoMinutos,
      })
      .select()
      .single();
    if (error) throw error;
    return data as HorarioDisponivel;
  },

  async marcarIndisponivel(horarioId: string) {
    const client = await getClient();
    const { error } = await client
      .from('horarios_disponiveis_consultor')
      .update({ disponivel: false })
      .eq('id', horarioId);
    if (error) throw error;
  },

  async marcarDisponivel(horarioId: string) {
    const client = await getClient();
    const { error } = await client
      .from('horarios_disponiveis_consultor')
      .update({ disponivel: true })
      .eq('id', horarioId);
    if (error) throw error;
  },
};

// ============================================================
// AGENDAMENTOS DO USUÁRIO
// ============================================================

export const queryAgendamentos = {
  async list(fazendaId: string, filters?: any) {
    const client = await getClient();
    let query = client
      .from('agendamentos_usuario')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data_agendada', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AgendamentoUsuario[];
  },

  async getById(id: string) {
    const client = await getClient();
    const { data, error } = await client
      .from('agendamentos_usuario')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return data as AgendamentoUsuario;
  },

  async create(fazendaId: string, consultorId: string, payload: CriarAgendamentoInput) {
    const client = await getClient();

    // Se tiver horário_disponivel_id, buscar data_hora
    let dataAgendada: string | null = null;
    if (payload.horario_disponivel_id) {
      const { data: horario } = await client
        .from('horarios_disponiveis_consultor')
        .select('data_hora')
        .eq('id', payload.horario_disponivel_id)
        .single();

      if (!horario) throw new Error('Horário não encontrado');
      dataAgendada = horario.data_hora;
    }

    const { data, error } = await client
      .from('agendamentos_usuario')
      .insert({
        fazenda_id: fazendaId,
        consultor_id: consultorId,
        horario_disponivel_id: payload.horario_disponivel_id || null,
        tipo: payload.tipo,
        data_agendada: dataAgendada || new Date().toISOString(),
        observacoes: payload.observacoes,
        link_reuniao: payload.link_reuniao || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AgendamentoUsuario;
  },

  async atualizarStatus(id: string, payload: AtualizarStatusAgendamentoInput) {
    const client = await getClient();
    const { data, error } = await client
      .from('agendamentos_usuario')
      .update({
        status: payload.status,
        motivo_recusa: payload.motivo_recusa || null,
        sugestao_nova_data: payload.sugestao_nova_data?.toISOString() || null,
        link_reuniao: payload.link_reuniao || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AgendamentoUsuario;
  },

  async delete(id: string) {
    const client = await getClient();
    const { error } = await client
      .from('agendamentos_usuario')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// HISTÓRICO DE ATENDIMENTOS
// ============================================================

export const queryHistoricoAtendimentos = {
  async list(fazendaId: string) {
    const client = await getClient();
    const { data, error } = await client
      .from('historico_atendimentos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data_atendimento', { ascending: false });
    if (error) throw error;
    return (data || []) as HistoricoAtendimento[];
  },

  async create(fazendaId: string, payload: HistoricoAtendimentoInput) {
    const client = await getClient();
    const { data, error } = await client
      .from('historico_atendimentos')
      .insert({
        fazenda_id: fazendaId,
        ...payload,
        data_atendimento: payload.data_atendimento.toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data as HistoricoAtendimento;
  },
};
