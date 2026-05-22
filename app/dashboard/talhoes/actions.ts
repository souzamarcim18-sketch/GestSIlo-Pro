'use server';

import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';

/**
 * Vincula colaborador a uma atividade de campo.
 * Chamado do Client Component AtividadeDialog após q.atividadesCampo.create().
 * Falhas internas são logadas — nunca propagadas para o usuário.
 */
export async function vincularColaboradorAtividadeAction(
  atividadeId: string,
  colaboradorId: string | null,
): Promise<void> {
  if (!colaboradorId) return;
  await upsertRegistroColaborador('atividade_campo', atividadeId, colaboradorId);
}
