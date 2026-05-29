'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  queryAnotacoes,
  queryAgendamentos,
  queryHistoricoAtendimentos,
  queryHorarios,
} from '@/lib/supabase/assessoria';
import {
  anotacaoFormSchema,
  criarAgendamentoSchema,
  atualizarStatusAgendamentoSchema,
  historicoAtendimentoSchema,
} from '@/lib/validations/assessoria';
import {
  enviarEmailSolicitacaoAgendamento,
  enviarEmailConfirmacaoAgendamento,
} from '@/lib/services/email';

async function getMeuFazendaId(): Promise<string> {
  const cookieStore = await cookies();
  const client = createServerClient(
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
  const { data } = await client.rpc('get_minha_fazenda_id');
  return data as string;
}

async function getMeuId(): Promise<string> {
  const cookieStore = await cookies();
  const client = createServerClient(
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
  const { data: { user } } = await client.auth.getUser();
  return user?.id || '';
}

// ============================================================
// ANOTAÇÕES
// ============================================================

export async function criarAnotacaoAction(payload: unknown) {
  try {
    const validated = anotacaoFormSchema.parse(payload);
    const fazendaId = await getMeuFazendaId();
    const anotacao = await queryAnotacoes.create(fazendaId, validated);
    return { success: true, data: anotacao, message: 'Anotação criada com sucesso' };
  } catch (error) {
    console.error('[criarAnotacaoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function atualizarAnotacaoAction(id: string, payload: unknown) {
  try {
    const validated = anotacaoFormSchema.parse(payload);
    const anotacao = await queryAnotacoes.update(id, validated);
    return { success: true, data: anotacao, message: 'Anotação atualizada' };
  } catch (error) {
    console.error('[atualizarAnotacaoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function deletarAnotacaoAction(id: string) {
  try {
    console.log('[deletarAnotacaoAction] Iniciando deleção de:', id);
    await queryAnotacoes.delete(id);
    console.log('[deletarAnotacaoAction] Deleção bem-sucedida');
    return { success: true, message: 'Anotação deletada com sucesso' };
  } catch (error) {
    console.error('[deletarAnotacaoAction] Erro completo:', error);
    console.error('[deletarAnotacaoAction] Tipo de erro:', typeof error);
    console.error('[deletarAnotacaoAction] Stack:', error instanceof Error ? error.stack : undefined);

    let errorMsg = 'Erro desconhecido';
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMsg = JSON.stringify(error);
    }

    console.error('[deletarAnotacaoAction] Mensagem final:', errorMsg);
    return { success: false, message: `Erro ao deletar: ${errorMsg}` };
  }
}

export async function marcarAnotacaoResolvidaAction(id: string, payload: { resolvida: boolean; assessor_resposta?: string }) {
  try {
    const anotacao = await queryAnotacoes.marcarResolvida(id, payload);
    return { success: true, data: anotacao, message: 'Status atualizado' };
  } catch (error) {
    console.error('[marcarAnotacaoResolvidaAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

// ============================================================
// AGENDAMENTOS
// ============================================================

export async function criarAgendamentoAction(payload: unknown) {
  try {
    const validated = criarAgendamentoSchema.parse(payload);
    const fazendaId = await getMeuFazendaId();

    const agendamento = await queryAgendamentos.create(fazendaId, validated.consultor_id, validated);

    // Buscar dados da fazenda e usuário para email
    const cookieStore = await cookies();
    const client = createServerClient(
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

    const { data: fazenda } = await client
      .from('fazendas')
      .select('nome')
      .eq('id', fazendaId)
      .single();
    const { data: { user } } = await client.auth.getUser();

    // Enviar email com link mágico
    await enviarEmailSolicitacaoAgendamento(
      agendamento as unknown as Record<string, unknown>,
      fazenda || { nome: 'Fazenda' },
      { nome: user?.user_metadata?.nome || 'Usuário' }
    );

    return {
      success: true,
      data: agendamento,
      message: 'Agendamento solicitado! Email enviado para o consultor.',
    };
  } catch (error) {
    console.error('[criarAgendamentoAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar agendamento',
    };
  }
}

export async function atualizarStatusAgendamentoAction(id: string, payload: unknown) {
  try {
    const validated = atualizarStatusAgendamentoSchema.parse(payload);
    const agendamento = await queryAgendamentos.atualizarStatus(id, validated);

    // Se confirmado, marcar horário como indisponível
    if (validated.status === 'confirmado') {
      await queryHorarios.marcarIndisponivel(agendamento.horario_disponivel_id);
    }

    // Se recusado ou remarcado, liberar horário
    if (validated.status === 'recusado' || validated.status === 'remarcado') {
      await queryHorarios.marcarDisponivel(agendamento.horario_disponivel_id);
    }

    // Enviar email de confirmação/recusa/remarcação
    await enviarEmailConfirmacaoAgendamento(agendamento as unknown as Record<string, unknown>, {}, validated.status);

    return { success: true, data: agendamento, message: 'Status atualizado com sucesso' };
  } catch (error) {
    console.error('[atualizarStatusAgendamentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function cancelarAgendamentoAction(id: string) {
  try {
    const agendamento = await queryAgendamentos.atualizarStatus(id, {
      status: 'cancelado',
    });
    return { success: true, message: 'Agendamento cancelado' };
  } catch (error) {
    console.error('[cancelarAgendamentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

// ============================================================
// HISTÓRICO
// ============================================================

export async function criarHistoricoAtendimentoAction(payload: unknown) {
  try {
    const validated = historicoAtendimentoSchema.parse(payload);
    const fazendaId = await getMeuFazendaId();
    const historico = await queryHistoricoAtendimentos.create(fazendaId, validated);
    return { success: true, data: historico, message: 'Histórico criado com sucesso' };
  } catch (error) {
    console.error('[criarHistoricoAtendimentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}
