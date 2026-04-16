'use server';

import { revalidatePath } from 'next/cache';
import { qServer } from '@/lib/supabase/queries-audit';
import type { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';

/**
 * Server Action para salvar um novo planejamento de silagem.
 */
export async function savePlanejamentoAction(
  payload: Omit<PlanejamentoSilagem, 'id' | 'created_at' | 'fazenda_id'>
): Promise<{ success: boolean; data?: PlanejamentoSilagem; error?: string }> {
  try {
    const result = await qServer.planejamentosSilagem.create(payload as any);
    revalidatePath('/dashboard/planejamento-silagem/historico');
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Erro ao salvar planejamento:', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
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
