'use server';

import { q } from '@/lib/supabase/queries-audit';
import { supabase } from '@/lib/supabase';
import { insumoFormSchema, saidaFormSchema, ajusteInventarioSchema } from '@/lib/validations/insumos';
import { revalidatePath } from 'next/cache';

/**
 * Cria um novo insumo com movimentação de entrada inicial.
 * Valida que tipo_id pertence à categoria_id selecionada.
 */
export async function criarInsumoAction(formData: unknown) {
  const parsed = insumoFormSchema.parse(formData);

  try {
    // Se tipo_id fornecido, validar que pertence à categoria_id
    if (parsed.tipo_id) {
      const tipo = await q.tipos.getById(parsed.tipo_id);
      if (tipo.categoria_id !== parsed.categoria_id) {
        throw new Error('Tipo selecionado não pertence à categoria escolhida');
      }
    }

    // Criar insumo
    const insumo = await q.insumos.create({
      nome: parsed.nome,
      categoria_id: parsed.categoria_id,
      tipo_id: parsed.tipo_id,
      unidade: parsed.unidade,
      fornecedor: parsed.fornecedor,
      local_armazen: parsed.local_armazen,
      estoque_minimo: parsed.estoque_minimo,
      estoque_atual: parsed.quantidade_entrada, // Inicia com quantidade_entrada
      custo_medio: parsed.valor_unitario,
      observacoes: parsed.observacoes,
      ativo: true,
    } as any);

    // Criar movimentação de entrada
    const movimentacao = await q.movimentacoesInsumo.create({
      insumo_id: insumo.id,
      tipo: 'Entrada',
      quantidade: parsed.quantidade_entrada,
      valor_unitario: parsed.valor_unitario,
      data: new Date().toISOString().split('T')[0],
      origem: 'manual',
    } as any);

    // Integração Financeiro: Se marcado, criar despesa automática
    let despesa_id: string | null = null;
    if (parsed.registrar_como_despesa) {
      try {
        const despesa = await q.financeiro.create({
          categoria: 'Insumos',
          descricao: `Entrada de ${insumo.nome}: ${parsed.quantidade_entrada} ${parsed.unidade}`,
          valor: parsed.quantidade_entrada * parsed.valor_unitario,
          data: new Date().toISOString().split('T')[0],
          tipo: 'Despesa',
          referencia: movimentacao.id,
        } as any);

        despesa_id = despesa.id;

        // Linkar despesa à movimentação
        await supabase
          .from('movimentacoes_insumo')
          .update({ despesa_id })
          .eq('id', movimentacao.id);
      } catch (despesaError) {
        // Se falhar ao criar despesa, reverter movimentação (transação atômica)
        console.error('Erro ao criar despesa. Revertendo movimentação.', despesaError);
        await q.movimentacoesInsumo.remove(movimentacao.id);
        throw new Error(
          'Falha ao registrar como despesa. Operação revertida. Tente novamente.'
        );
      }
    }

    revalidatePath('/dashboard/insumos');
    return { success: true, insumo, despesa_id };
  } catch (error) {
    console.error('Erro ao criar insumo:', error);
    throw error;
  }
}

/**
 * Atualiza um insumo existente.
 */
export async function atualizarInsumoAction(id: string, formData: unknown) {
  const parsed = insumoFormSchema.parse(formData);

  try {
    // Se tipo_id fornecido, validar que pertence à categoria_id
    if (parsed.tipo_id) {
      const tipo = await q.tipos.getById(parsed.tipo_id);
      if (tipo.categoria_id !== parsed.categoria_id) {
        throw new Error('Tipo selecionado não pertence à categoria escolhida');
      }
    }

    const insumo = await q.insumos.update(id, {
      nome: parsed.nome,
      categoria_id: parsed.categoria_id,
      tipo_id: parsed.tipo_id,
      unidade: parsed.unidade,
      fornecedor: parsed.fornecedor,
      local_armazen: parsed.local_armazen,
      estoque_minimo: parsed.estoque_minimo,
      observacoes: parsed.observacoes,
    } as any);

    revalidatePath('/dashboard/insumos');
    return { success: true, insumo };
  } catch (error) {
    console.error('Erro ao atualizar insumo:', error);
    throw error;
  }
}

/**
 * Deleta (soft-delete) um insumo.
 */
export async function deletarInsumoAction(id: string) {
  try {
    await q.insumos.delete(id);
    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar insumo:', error);
    throw error;
  }
}

/**
 * Registra uma saída de insumo (com validação de estoque).
 */
export async function criarSaidaAction(formData: unknown) {
  const parsed = saidaFormSchema.parse(formData);

  try {
    // Buscar insumo para validar estoque e obter custo_medio
    const insumo = await q.insumos.getById(parsed.insumo_id);

    // Validar estoque
    if (insumo.estoque_atual < parsed.quantidade) {
      throw new Error(
        `Estoque insuficiente. Disponível: ${insumo.estoque_atual} ${insumo.unidade}, Solicitado: ${parsed.quantidade}`
      );
    }

    await q.movimentacoesInsumo.create({
      insumo_id: parsed.insumo_id,
      tipo: 'Saída',
      quantidade: parsed.quantidade,
      valor_unitario: parsed.valor_unitario || insumo.custo_medio,
      tipo_saida: parsed.tipo_saida as any,
      destino_tipo: parsed.destino_tipo as any,
      destino_id: parsed.destino_id,
      responsavel: parsed.responsavel,
      data: parsed.data as string,
      observacoes: parsed.observacoes,
      origem: 'manual',
    } as any);

    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    throw error;
  }
}

/**
 * Cria um ajuste de inventário (diferença entre real e sistema).
 */
export async function criarAjusteAction(formData: unknown) {
  const parsed = ajusteInventarioSchema.parse(formData);

  try {
    await q.movimentacoesInsumo.createAjuste(
      parsed.insumo_id,
      parsed.estoque_real,
      parsed.motivo
    );

    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar ajuste:', error);
    throw error;
  }
}
