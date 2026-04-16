'use server';

import { q } from '@/lib/supabase/queries-audit';
import type { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';

/**
 * Server Action para salvar um novo planejamento de silagem.
 *
 * Recebe o payload completo (sem fazenda_id) e:
 * 1. Obtém o fazenda_id do usuário logado
 * 2. Adiciona o fazenda_id ao payload
 * 3. Chama q.planejamentosSilagem.create()
 * 4. Retorna o planejamento salvo ou erro
 */
export async function savePlanejamentoAction(
  payload: Omit<PlanejamentoSilagem, 'id' | 'created_at' | 'fazenda_id'>
): Promise<{ success: boolean; data?: PlanejamentoSilagem; error?: string }> {
  try {
    // A função q.planejamentosSilagem.create() já chama getFazendaId() internamente
    const result = await q.planejamentosSilagem.create(payload as any);
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
