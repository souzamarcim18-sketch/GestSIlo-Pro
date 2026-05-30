'use server';

import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { abrirSiloSchema } from '@/lib/validations/silos';

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

/**
 * Registra manualmente a abertura de um silo (data_abertura_real).
 * Complementa o fluxo automático que ocorre na primeira saída registrada.
 */
export async function abrirSiloAction(
  siloId: string,
  dataAbertura: string,
  observacoes?: string,
): Promise<{ success: boolean; error?: string }> {
  const parsed = abrirSiloSchema.safeParse({
    silo_id: siloId,
    data_abertura_real: dataAbertura,
    observacoes: observacoes ?? null,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autenticado' };

  const { error } = await supabase
    .from('silos')
    .update({ data_abertura_real: parsed.data.data_abertura_real })
    .eq('id', siloId);

  if (error) return { success: false, error: 'Erro ao registrar abertura do silo' };
  return { success: true };
}
