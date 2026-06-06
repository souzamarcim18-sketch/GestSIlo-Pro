'use server';

import { revalidatePath } from 'next/cache';
import { qServer } from '@/lib/supabase/queries-audit';
import { detectarRebanho, projetarRebanho } from '@/lib/supabase/rebanho';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parsePlanoSlug, planoPermiteMaisRegistros } from '@/lib/planos';
import type { PlanejamentoSilagem, RebanhoSnapshot } from '@/lib/types/planejamento-silagem';
import type { DeteccaoRebanho, RebanhoProjetado } from '@/lib/types/rebanho';

/**
 * Server Action para salvar um novo planejamento de silagem.
 */
export async function savePlanejamentoAction(
  payload: Omit<PlanejamentoSilagem, 'id' | 'created_at' | 'fazenda_id'> & {
    rebanho_snapshot?: RebanhoSnapshot;
  }
): Promise<{ success: boolean; data?: PlanejamentoSilagem; error?: string; limite?: number }> {
  // Verificação de limite de plano
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('fazenda_id')
      .eq('id', user.id)
      .single();
    if (profile?.fazenda_id) {
      const { data: fazenda } = await supabase
        .from('fazendas')
        .select('plano_atual')
        .eq('id', profile.fazenda_id)
        .single();
      const plano = parsePlanoSlug(fazenda?.plano_atual);
      const limite = (plano === 'free') ? 1 : Infinity;
      if (limite !== Infinity) {
        const { count } = await supabase
          .from('planejamentos_silagem')
          .select('id', { count: 'exact', head: true })
          .eq('fazenda_id', profile.fazenda_id);
        if (!planoPermiteMaisRegistros(plano, 'planejamentos', count ?? 0)) {
          return { success: false, error: 'limite_atingido', limite };
        }
      }
    }
  }

  try {
    const result = await qServer.planejamentosSilagem.create(payload);
    revalidatePath('/dashboard/planejamento-silagem/historico');
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Erro ao salvar planejamento:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';

    // Detectar erro de coluna inexistente
    if (
      mensagem.includes('rebanho_snapshot') ||
      mensagem.includes('column') ||
      mensagem.includes('does not exist')
    ) {
      return {
        success: false,
        error:
          'Coluna rebanho_snapshot não existe. Execute:\nALTER TABLE planejamentos_silagem ADD COLUMN rebanho_snapshot JSONB;',
      };
    }

    return {
      success: false,
      error: mensagem,
    };
  }
}

/**
 * Server Action para listar todos os planejamentos do usuário.
 */
export async function listPlanejamentosAction(): Promise<{
  success: boolean;
  data?: PlanejamentoSilagem[];
  error?: string;
}> {
  try {
    const result = await qServer.planejamentosSilagem.list();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Erro ao listar planejamentos:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      error: mensagem,
    };
  }
}

/**
 * Server Action para obter um planejamento específico pelo ID.
 */
export async function getPlanejamentoAction(id: string): Promise<{
  success: boolean;
  data?: PlanejamentoSilagem;
  error?: string;
}> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('ID inválido');
    }
    const result = await qServer.planejamentosSilagem.getById(id);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Erro ao buscar planejamento:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      error: mensagem,
    };
  }
}

/**
 * Server Action para deletar um planejamento.
 */
export async function deletePlanejamentoAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('ID inválido');
    }
    await qServer.planejamentosSilagem.delete(id);
    revalidatePath('/dashboard/planejamento-silagem/historico');
    return {
      success: true,
    };
  } catch (error) {
    console.error('Erro ao deletar planejamento:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      error: mensagem,
    };
  }
}

/**
 * Server Action para detectar se existe rebanho cadastrado na fazenda.
 */
export async function detectarRebanhoAction(): Promise<DeteccaoRebanho> {
  return detectarRebanho();
}

/**
 * Server Action para projetar o rebanho até uma data alvo.
 */
export async function projetarRebanhoAction(dataAlvo: Date): Promise<RebanhoProjetado> {
  return projetarRebanho(dataAlvo);
}

/**
 * Server Action para atualizar o nome de um planejamento.
 */
export async function updatePlanejamentoNomeAction(
  id: string,
  nome: string
): Promise<{
  success: boolean;
  data?: PlanejamentoSilagem;
  error?: string;
}> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('ID inválido');
    }
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      throw new Error('Nome inválido');
    }
    const result = await qServer.planejamentosSilagem.updateNome(id, nome.trim());
    revalidatePath('/dashboard/planejamento-silagem/historico');
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Erro ao atualizar planejamento:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      error: mensagem,
    };
  }
}
