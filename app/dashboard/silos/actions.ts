'use server';

import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';

/**
 * Vincula colaborador ao cadastro de um silo.
 * Chamado do Client Component SiloForm após q.silos.create().
 */
export async function vincularColaboradorSiloAction(
  siloId: string,
  colaboradorId: string | null,
): Promise<void> {
  if (!colaboradorId) return;
  await upsertRegistroColaborador('cadastro_silo', siloId, colaboradorId);
}
