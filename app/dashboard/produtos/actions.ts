'use server';

import {
  getProdutoById,
  createProduto,
  updateProduto,
  removeProduto,
  createMovimentacaoProduto,
  getMovimentacaoProdutoById,
  removeMovimentacaoProduto,
  countMovimentacoesByProduto,
  createAjusteInventario,
} from '@/lib/supabase/produtos';
import { qServer } from '@/lib/supabase/queries-audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  produtoFormSchema,
  entradaFormSchema,
  saidaFormSchema,
  ajusteInventarioSchema,
} from '@/lib/validations/produtos';
import { revalidatePath } from 'next/cache';

export async function criarProdutoAction(formData: unknown) {
  const parsed = produtoFormSchema.parse(formData);

  const produto = await createProduto({
    nome: parsed.nome,
    categoria_id: parsed.categoria_id,
    unidade: parsed.unidade,
    estoque_minimo: parsed.estoque_minimo,
    custo_referencia: parsed.custo_referencia ?? null,
    local_armazen: parsed.local_armazen ?? null,
    observacoes: parsed.observacoes ?? null,
    ativo: true,
    data_cadastro: new Date().toISOString().split('T')[0],
  });

  if ((parsed.quantidade_entrada ?? 0) > 0) {
    await createMovimentacaoProduto({
      produto_id: produto.id,
      tipo: 'Entrada',
      tipo_entrada: 'AJUSTE_INICIAL',
      quantidade: parsed.quantidade_entrada!,
      valor_unitario: parsed.valor_unitario ?? null,
      data: new Date().toISOString().split('T')[0],
      origem: 'manual',
    });
  }

  revalidatePath('/dashboard/produtos');
  return { success: true, produto };
}

export async function atualizarProdutoAction(id: string, formData: unknown) {
  const parsed = produtoFormSchema.parse(formData);

  await updateProduto(id, {
    nome: parsed.nome,
    categoria_id: parsed.categoria_id,
    unidade: parsed.unidade,
    estoque_minimo: parsed.estoque_minimo,
    custo_referencia: parsed.custo_referencia ?? null,
    local_armazen: parsed.local_armazen ?? null,
    observacoes: parsed.observacoes ?? null,
  });

  revalidatePath('/dashboard/produtos');
  return { success: true };
}

export async function deletarProdutoAction(id: string) {
  const count = await countMovimentacoesByProduto(id);

  if (count > 0) {
    await updateProduto(id, { ativo: false });
  } else {
    await removeProduto(id);
  }

  revalidatePath('/dashboard/produtos');
  return { success: true };
}

export async function criarEntradaAction(formData: unknown) {
  const parsed = entradaFormSchema.parse(formData);

  await createMovimentacaoProduto({
    produto_id: parsed.produto_id,
    tipo: 'Entrada',
    tipo_entrada: parsed.tipo_entrada,
    quantidade: parsed.quantidade,
    valor_unitario: parsed.valor_unitario ?? null,
    data: parsed.data,
    responsavel: parsed.responsavel ?? null,
    observacoes: parsed.observacoes ?? null,
    origem: 'manual',
  });

  revalidatePath('/dashboard/produtos');
  return { success: true };
}

export async function criarSaidaProdutoAction(formData: unknown) {
  const parsed = saidaFormSchema.parse(formData);

  const produto = await getProdutoById(parsed.produto_id);

  if (produto.estoque_atual < parsed.quantidade) {
    throw new Error(
      `Estoque insuficiente. Disponível: ${produto.estoque_atual} ${produto.unidade}, solicitado: ${parsed.quantidade}`
    );
  }

  const mov = await createMovimentacaoProduto({
    produto_id: parsed.produto_id,
    tipo: 'Saída',
    tipo_saida: parsed.tipo_saida,
    quantidade: parsed.quantidade,
    valor_unitario: parsed.valor_unitario ?? null,
    data: parsed.data,
    responsavel: parsed.responsavel ?? null,
    observacoes: parsed.observacoes ?? null,
    insumo_id_destino:
      parsed.tipo_saida === 'TRANSFERENCIA_INSUMO' ? (parsed.insumo_id_destino ?? null) : null,
    origem: 'manual',
  });

  if (parsed.tipo_saida === 'TRANSFERENCIA_INSUMO' && parsed.insumo_id_destino) {
    const supabase = await createSupabaseServerClient();
    await supabase.from('movimentacoes_insumo').insert({
      insumo_id: parsed.insumo_id_destino,
      tipo: 'Entrada',
      quantidade: parsed.quantidade,
      valor_unitario: parsed.valor_unitario ?? null,
      origem: 'produto',
      produto_id_origem: parsed.produto_id,
      data: parsed.data,
    });
  }

  if (parsed.tipo_saida === 'VENDA' && parsed.registrar_como_receita) {
    try {
      const receita = await qServer.financeiro.create({
        tipo: 'Receita',
        categoria: 'Produtos',
        descricao: `Venda: ${produto.nome}`,
        valor: parsed.quantidade * parsed.valor_unitario!,
        data: parsed.data,
        forma_pagamento: null,
        referencia_id: mov.id,
        referencia_tipo: 'movimentacoes_produto' as never,
        natureza: 'variavel',
      });

      const supabase = await createSupabaseServerClient();
      await supabase
        .from('movimentacoes_produto')
        .update({ receita_id: receita.id })
        .eq('id', mov.id);
    } catch {
      await removeMovimentacaoProduto(mov.id);
      throw new Error('Falha ao registrar receita. Operação revertida. Tente novamente.');
    }
  }

  revalidatePath('/dashboard/produtos');
  return { success: true };
}

export async function criarAjusteProdutoAction(formData: unknown) {
  const parsed = ajusteInventarioSchema.parse(formData);

  const produto = await getProdutoById(parsed.produto_id);

  await createAjusteInventario(
    parsed.produto_id,
    produto.estoque_atual,
    parsed.estoque_real,
    parsed.motivo
  );

  revalidatePath('/dashboard/produtos');
  return { success: true };
}

export async function deletarMovimentacaoProdutoAction(id: string) {
  const mov = await getMovimentacaoProdutoById(id);

  // Limpar receita financeira linkada
  if (mov.receita_id) {
    const supabase = await createSupabaseServerClient();
    await supabase.from('financeiro').delete().eq('id', mov.receita_id);
  }

  // Opção preferida da SPEC: UPDATE estoque_atual antes do DELETE
  // O trigger só age em AFTER INSERT; compensação manual para DELETE
  let delta = 0;
  if (mov.tipo === 'Entrada') {
    delta = -mov.quantidade;
  } else if (mov.tipo === 'Saída') {
    delta = mov.quantidade;
  } else if (mov.tipo === 'Ajuste' && mov.sinal_ajuste != null) {
    delta = -(mov.quantidade * mov.sinal_ajuste);
  }

  if (delta !== 0) {
    const supabase = await createSupabaseServerClient();
    const { data: prod } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', mov.produto_id)
      .single();

    if (prod) {
      await supabase
        .from('produtos')
        .update({ estoque_atual: (prod as { estoque_atual: number }).estoque_atual + delta })
        .eq('id', mov.produto_id);
    }
  }

  await removeMovimentacaoProduto(id);

  revalidatePath('/dashboard/produtos');
  return { success: true };
}
