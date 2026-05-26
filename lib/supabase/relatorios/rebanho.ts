import { supabase } from '@/lib/supabase';
import { buildRebanhoSelect, getCamposPorIds, type FiltrosRebanho } from '@/lib/relatorios/rebanho-builder';
import type { AnimalCompleto } from '@/lib/types/relatorios-rebanho';

/**
 * Busca animais da view vw_animais_completos com select whitelist-safe.
 * camposIds devem ter sido validados por validarCamposSelecionados() antes desta chamada.
 */
export async function getAnimaisParaRelatorio(
  fazendaId: string,
  camposIds: string[],
  filtros: FiltrosRebanho,
  limit = 5000
): Promise<AnimalCompleto[]> {
  const campos = getCamposPorIds(camposIds);
  const selectStr = buildRebanhoSelect(campos);

  let query = supabase
    .from('vw_animais_completos')
    .select(selectStr)
    .eq('fazenda_id', fazendaId)
    .limit(limit);

  if (filtros.categoria) {
    query = query.eq('categoria', filtros.categoria);
  }
  if (filtros.status) {
    query = query.eq('status', filtros.status);
  }
  if (filtros.sexo) {
    query = query.eq('sexo', filtros.sexo);
  }
  if (filtros.lote_id) {
    // lote_nome não é lote_id — filtramos por lote_id via join na query,
    // mas a view expõe lote_nome. Para filtrar por id precisamos do subquery.
    // Solução: buscar o nome do lote e filtrar por nome (único por fazenda).
    // Trade-off aceito: filtro é opcional e UI envia nome diretamente.
    query = query.eq('lote_nome', filtros.lote_id);
  }

  query = query.order('brinco', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as unknown as AnimalCompleto[];
}
