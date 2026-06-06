'use server';

import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { abrirSiloSchema } from '@/lib/validations/silos';
import { parsePlanoSlug, planoPermiteMaisRegistros } from '@/lib/planos';

/**
 * Verifica se o plano da fazenda permite criar mais silos.
 * Retorna null se permitido, ou { error, limite } se bloqueado.
 */
export async function verificarLimiteSilosAction(): Promise<{ error: 'limite_atingido'; limite: number } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();
  if (!profile?.fazenda_id) return null;

  const { data: fazenda } = await supabase
    .from('fazendas')
    .select('plano_atual')
    .eq('id', profile.fazenda_id)
    .single();

  const plano = parsePlanoSlug(fazenda?.plano_atual);
  const limite = (plano === 'free') ? 2 : Infinity;
  if (limite === Infinity) return null;

  const { count } = await supabase
    .from('silos')
    .select('id', { count: 'exact', head: true })
    .eq('fazenda_id', profile.fazenda_id);

  const atual = count ?? 0;
  if (!planoPermiteMaisRegistros(plano, 'silos', atual)) {
    return { error: 'limite_atingido', limite };
  }
  return null;
}

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
