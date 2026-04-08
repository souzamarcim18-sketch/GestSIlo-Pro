import { supabase, Insumo, MovimentacaoInsumo } from '../supabase';

// ---------------------------------------------------------------------------
// Insumos
// ---------------------------------------------------------------------------

export async function getInsumosByFazenda(fazendaId: string): Promise<Insumo[]> {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Insumo[];
}

export async function createInsumo(insumo: Omit<Insumo, 'id'>): Promise<Insumo> {
  const { data, error } = await supabase
    .from('insumos')
    .insert(insumo)
    .select()
    .single();
  if (error) throw error;
  return data as Insumo;
}

export async function updateInsumo(id: string, insumo: Partial<Insumo>): Promise<Insumo> {
  const { data, error } = await supabase
    .from('insumos')
    .update(insumo)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Insumo;
}

export async function deleteInsumo(id: string): Promise<void> {
  // Deleta movimentações vinculadas primeiro (caso ON DELETE CASCADE não esteja ativo)
  const { error: movError } = await supabase
    .from('movimentacoes_insumo')
    .delete()
    .eq('insumo_id', id);
  if (movError) throw movError;

  const { error } = await supabase
    .from('insumos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Movimentações de Insumo
// ---------------------------------------------------------------------------

export async function getMovimentacoesByInsumo(
  insumoId: string
): Promise<MovimentacaoInsumo[]> {
  const { data, error } = await supabase
    .from('movimentacoes_insumo')
    .select('*')
    .eq('insumo_id', insumoId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data as MovimentacaoInsumo[];
}

/**
 * Busca todas as movimentações dos insumos de uma fazenda.
 * O JOIN via insumos garante isolamento mesmo sem filtro direto de fazenda_id.
 */
export async function getTodasMovimentacoesByFazenda(
  fazendaId: string
): Promise<(MovimentacaoInsumo & { insumo_nome: string; insumo_unidade: string })[]> {
  const { data, error } = await supabase
    .from('movimentacoes_insumo')
    .select(`
      *,
      insumos!inner(nome, unidade, fazenda_id)
    `)
    .eq('insumos.fazenda_id', fazendaId)
    .order('data', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    insumo_nome: row.insumos?.nome ?? '',
    insumo_unidade: row.insumos?.unidade ?? '',
    insumos: undefined,
  }));
}

/**
 * Registra uma movimentação e atualiza o estoque_atual do insumo.
 * Entrada  → estoque sobe
 * Saída    → estoque desce (nunca abaixo de zero no banco)
 */
export async function createMovimentacaoInsumo(
  mov: Omit<MovimentacaoInsumo, 'id'>
): Promise<MovimentacaoInsumo> {
  // 1. Inserir a movimentação
  const { data, error } = await supabase
    .from('movimentacoes_insumo')
    .insert(mov)
    .select()
    .single();
  if (error) throw error;

  // 2. Ajustar estoque_atual — busca valor atual e recalcula
  const { data: insumo, error: fetchErr } = await supabase
    .from('insumos')
    .select('estoque_atual')
    .eq('id', mov.insumo_id)
    .single();
  if (fetchErr) throw fetchErr;

  const delta = mov.tipo === 'Entrada' ? mov.quantidade : -mov.quantidade;
  const novoEstoque = Math.max(0, (insumo.estoque_atual ?? 0) + delta);

  const { error: updateErr } = await supabase
    .from('insumos')
    .update({ estoque_atual: novoEstoque })
    .eq('id', mov.insumo_id);
  if (updateErr) throw updateErr;

  return data as MovimentacaoInsumo;
}
