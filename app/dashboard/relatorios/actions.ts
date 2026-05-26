'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { getRelatorioMaoObra, type RelatorioMaoObraResult } from '@/lib/supabase/relatorios/mao-de-obra';
import { getRelatorioPastagens, type RelatorioPastagensResult } from '@/lib/supabase/relatorios/pastagens';

async function assertAdminOuVisualizador() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  if (profileRes.data?.perfil === 'Operador') redirect('/operador');

  const fazendaId = await getCurrentFazendaId();
  const fazendaRes = await supabase
    .from('fazendas')
    .select('nome')
    .eq('id', fazendaId)
    .single();

  return { fazendaId, fazendaNome: fazendaRes.data?.nome ?? 'Minha Fazenda' };
}

// ── Mão de Obra ───────────────────────────────────────────────────────────────

export interface GetRelatorioMaoObraParams {
  from: string; // ISO string
  to: string;   // ISO string
}

export async function getRelatorioMaoObraAction(
  params: GetRelatorioMaoObraParams
): Promise<RelatorioMaoObraResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioMaoObra(fazendaId, new Date(params.from), new Date(params.to));
  return { ...result, fazendaNome };
}

// ── Pastagens ─────────────────────────────────────────────────────────────────

export interface GetRelatorioPastagensParams {
  from: string;
  to: string;
}

export async function getRelatorioPastagensAction(
  params: GetRelatorioPastagensParams
): Promise<RelatorioPastagensResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioPastagens(fazendaId, new Date(params.from), new Date(params.to));
  return { ...result, fazendaNome };
}
