'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';

export interface ProdutoRow {
  id: string;
  nome: string;
  categoria_nome: string | null;
  unidade_medida: string;
  estoque_atual: number;
  estoque_minimo: number | null;
  valor_unitario: number | null;
  ativo: boolean;
}

export interface MovimentacaoProdutoRow {
  id: string;
  produto_nome: string;
  tipo: string;
  tipo_saida: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_total: number | null;
  data: string;
  descricao: string | null;
  responsavel: string | null;
}

export interface RelatorioProdutosResult {
  produtos: ProdutoRow[];
  movimentacoes: MovimentacaoProdutoRow[];
  vendas: MovimentacaoProdutoRow[];
}

type RawProduto = {
  id: string;
  nome: string;
  unidade_medida: string;
  estoque_atual: number;
  estoque_minimo: number | null;
  valor_unitario: number | null;
  ativo: boolean;
  categorias_produto: { nome: string } | { nome: string }[] | null;
};

type RawMovimentacao = {
  id: string;
  tipo: string;
  tipo_saida: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_total: number | null;
  data: string;
  descricao: string | null;
  responsavel: string | null;
  produtos: { nome: string } | { nome: string }[] | null;
};

function resolveCategoriaNome(cat: { nome: string } | { nome: string }[] | null): string | null {
  if (!cat) return null;
  if (Array.isArray(cat)) return cat[0]?.nome ?? null;
  return cat.nome;
}

function resolveProdutoNome(p: { nome: string } | { nome: string }[] | null): string {
  if (!p) return '';
  if (Array.isArray(p)) return p[0]?.nome ?? '';
  return p.nome;
}

export async function getRelatorioProdutos(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioProdutosResult> {
  const supabase = await createSupabaseServerClient();
  const { gte, lte } = toUtcRangeFromLocal(from, to);

  const [produtosRes, movsRes] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, unidade_medida, estoque_atual, estoque_minimo, valor_unitario, ativo, categorias_produto(nome)')
      .eq('fazenda_id', fazendaId)
      .order('nome'),
    supabase
      .from('movimentacoes_produto')
      .select('id, tipo, tipo_saida, quantidade, valor_unitario, valor_total, data, descricao, responsavel, produtos(nome)')
      .eq('fazenda_id', fazendaId)
      .gte('data', gte)
      .lte('data', lte)
      .order('data', { ascending: false })
      .limit(10000),
  ]);

  const produtos: ProdutoRow[] = ((produtosRes.data ?? []) as unknown as RawProduto[]).map((p) => ({
    id: p.id,
    nome: p.nome,
    categoria_nome: resolveCategoriaNome(p.categorias_produto),
    unidade_medida: p.unidade_medida,
    estoque_atual: p.estoque_atual,
    estoque_minimo: p.estoque_minimo,
    valor_unitario: p.valor_unitario,
    ativo: p.ativo,
  }));

  const movimentacoes: MovimentacaoProdutoRow[] = ((movsRes.data ?? []) as unknown as RawMovimentacao[]).map((m) => ({
    id: m.id,
    produto_nome: resolveProdutoNome(m.produtos),
    tipo: m.tipo,
    tipo_saida: m.tipo_saida,
    quantidade: m.quantidade,
    valor_unitario: m.valor_unitario,
    valor_total: m.valor_total,
    data: m.data,
    descricao: m.descricao,
    responsavel: m.responsavel,
  }));

  const vendas = movimentacoes.filter((m) => m.tipo_saida === 'VENDA');

  return { produtos, movimentacoes, vendas };
}
