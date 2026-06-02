'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  queryAnotacoes,
  queryAgendamentos,
  queryHistoricoAtendimentos,
} from '@/lib/supabase/assessoria';
import {
  anotacaoFormSchema,
  historicoAtendimentoSchema,
} from '@/lib/validations/assessoria';

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

async function verificarOwnershipAnotacao(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const fazendaId = await getMeuFazendaId();
  if (!fazendaId) return { ok: false, message: 'Não autorizado' };
  try {
    const anotacao = await queryAnotacoes.getById(id);
    if (anotacao.fazenda_id !== fazendaId) return { ok: false, message: 'Não autorizado' };
    return { ok: true };
  } catch {
    // Não vazar se o registro existe ou não
    return { ok: false, message: 'Não autorizado' };
  }
}

export async function atualizarAnotacaoAction(id: string, payload: unknown) {
  try {
    const ownership = await verificarOwnershipAnotacao(id);
    if (!ownership.ok) return { success: false, message: ownership.message };
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
    const ownership = await verificarOwnershipAnotacao(id);
    if (!ownership.ok) return { success: false, message: ownership.message };
    await queryAnotacoes.delete(id);
    return { success: true, message: 'Anotação deletada com sucesso' };
  } catch (error) {
    console.error('[deletarAnotacaoAction]', error instanceof Error ? error.message : 'Erro desconhecido');
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao deletar anotação' };
  }
}

export async function marcarAnotacaoResolvidaAction(id: string, payload: { resolvida: boolean; assessor_resposta?: string }) {
  try {
    const ownership = await verificarOwnershipAnotacao(id);
    if (!ownership.ok) return { success: false, message: ownership.message };
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

export async function cancelarAgendamentoAction(id: string) {
  try {
    await queryAgendamentos.atualizarStatus(id, {
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
