'use server';

import { createSupabaseServerClient } from './server';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type ProdutoInsert = Omit<Database['public']['Tables']['produtos']['Insert'], 'id' | 'fazenda_id' | 'created_at' | 'atualizado_em'>;
type ProdutoUpdate = Omit<Database['public']['Tables']['produtos']['Update'], 'id' | 'fazenda_id' | 'created_at'>;

type MovimentacaoProdutoRow = Database['public']['Tables']['movimentacoes_produto']['Row'];
type MovimentacaoProdutoInsert = Omit<Database['public']['Tables']['movimentacoes_produto']['Insert'], 'id' | 'created_at'>;

type CategoriaProdutoRow = Database['public']['Tables']['categorias_produto']['Row'];

const PRODUTO_COLS = 'id, nome, categoria_id, unidade, estoque_atual, estoque_minimo, custo_referencia, local_armazen, observacoes, ativo, fazenda_id, criado_por, atualizado_por, atualizado_em, data_cadastro, created_at';
const MOV_PRODUTO_COLS = 'id, produto_id, tipo, tipo_entrada, tipo_saida, quantidade, valor_unitario, data, responsavel, observacoes, origem, sinal_ajuste, receita_id, insumo_id_destino, criado_por, created_at';

// ========== CATEGORIAS ==========

// A RLS de categorias_produto exige o role `authenticated` (policy categorias_produto_select_autenticados).
// Por isso usamos o cliente autenticado do servidor — um cliente anônimo retornaria zero linhas.
export async function listCategoriasProduto(): Promise<CategoriaProdutoRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('categorias_produto')
    .select('id, nome, unidade_padrao, icone, created_at')
    .order('nome');

  if (error) throw error;
  return data ?? [];
}

// ========== PRODUTOS ==========

export async function listProdutos(opts?: {
  ativo?: boolean;
  categoria_id?: string;
}): Promise<ProdutoRow[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('produtos')
    .select(PRODUTO_COLS)
    .order('nome');

  if (opts?.ativo !== undefined) {
    query = query.eq('ativo', opts.ativo);
  }
  if (opts?.categoria_id) {
    query = query.eq('categoria_id', opts.categoria_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProdutoById(id: string): Promise<ProdutoRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('produtos')
    .select(PRODUTO_COLS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduto(payload: ProdutoInsert): Promise<ProdutoRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('produtos')
    .insert(payload)
    .select(PRODUTO_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduto(id: string, payload: ProdutoUpdate): Promise<ProdutoRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('produtos')
    .update(payload)
    .eq('id', id)
    .select(PRODUTO_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function removeProduto(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ========== MOVIMENTAÇÕES DE PRODUTO ==========

export async function listMovimentacoesProduto(
  produtoId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MovimentacaoProdutoRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('movimentacoes_produto')
    .select(MOV_PRODUTO_COLS)
    .eq('produto_id', produtoId)
    .order('data', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

export async function getMovimentacaoProdutoById(id: string): Promise<MovimentacaoProdutoRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('movimentacoes_produto')
    .select(MOV_PRODUTO_COLS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMovimentacaoProduto(
  payload: MovimentacaoProdutoInsert
): Promise<MovimentacaoProdutoRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('movimentacoes_produto')
    .insert(payload)
    .select(MOV_PRODUTO_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function removeMovimentacaoProduto(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('movimentacoes_produto')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function countMovimentacoesByProduto(produtoId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from('movimentacoes_produto')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', produtoId);

  if (error) throw error;
  return count ?? 0;
}

// Ajuste de inventário: cria movimentação do tipo 'Ajuste' com sinal calculado
export async function createAjusteInventario(
  produtoId: string,
  estoqueAtual: number,
  estoqueReal: number,
  motivo: string
): Promise<MovimentacaoProdutoRow | null> {
  const delta = estoqueReal - estoqueAtual;
  if (delta === 0) return null;

  const sinalAjuste: 1 | -1 = delta > 0 ? 1 : -1;

  return createMovimentacaoProduto({
    produto_id: produtoId,
    tipo: 'Ajuste',
    quantidade: Math.abs(delta),
    sinal_ajuste: sinalAjuste,
    observacoes: motivo,
    data: new Date().toISOString().split('T')[0],
    origem: 'manual',
  });
}
