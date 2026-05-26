'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validarCamposSelecionados } from '@/lib/relatorios/rebanho-builder';
import { getAnimaisParaRelatorio } from '@/lib/supabase/relatorios/rebanho';
import type { FiltrosRebanho } from '@/lib/relatorios/rebanho-builder';
import type { AnimalCompleto } from '@/lib/types/relatorios-rebanho';

export interface RelatorioRebanhoResult {
  data: AnimalCompleto[];
  fazendaNome: string;
  totalAnimais: number;
  truncated: boolean;
}

export async function getRelatorioRebanhoAction(
  camposIds: string[],
  filtros: FiltrosRebanho,
  limit = 5000
): Promise<RelatorioRebanhoResult> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const [profileRes, fazendaRes] = await Promise.all([
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
    supabase.from('fazendas').select('id, nome').eq('owner_id', user.id).single(),
  ]);

  if (profileRes.data?.perfil === 'Operador') redirect('/operador');
  if (!fazendaRes.data) throw new Error('Fazenda não encontrada');

  const { validIds, invalidIds } = validarCamposSelecionados(camposIds);

  if (invalidIds.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('[getRelatorioRebanhoAction] Campos inválidos ignorados:', invalidIds);
  }

  const camposParaQuery = validIds.length > 0 ? validIds : ['brinco'];

  const animais = await getAnimaisParaRelatorio(
    fazendaRes.data.id,
    camposParaQuery,
    filtros,
    limit + 1 // busca 1 a mais para detectar truncagem
  );

  const truncated = animais.length > limit;
  const data = truncated ? animais.slice(0, limit) : animais;

  return {
    data,
    fazendaNome: fazendaRes.data.nome,
    totalAnimais: data.length,
    truncated,
  };
}
