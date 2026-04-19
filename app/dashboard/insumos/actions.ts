'use server';

import { q, qServer } from '@/lib/supabase/queries-audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { insumoFormSchema, saidaFormSchema, ajusteInventarioSchema } from '@/lib/validations/insumos';
import { revalidatePath } from 'next/cache';

/**
 * Cria um novo insumo com movimentação de entrada inicial.
 * Valida que tipo_id pertence à categoria_id selecionada.
 */
export async function criarInsumoAction(formData: unknown) {
  const parsed = insumoFormSchema.parse(formData);

  try {
    console.log('[criarInsumoAction] Iniciando com dados:', { nome: parsed.nome, categoria_id: parsed.categoria_id });

    // Se tipo_id fornecido, validar que pertence à categoria_id
    if (parsed.tipo_id) {
      console.log('[criarInsumoAction] Validando tipo_id:', parsed.tipo_id);
      const tipo = await qServer.tipos.getById(parsed.tipo_id);
      if (tipo.categoria_id !== parsed.categoria_id) {
        throw new Error('Tipo selecionado não pertence à categoria escolhida');
      }
    }

    // Criar insumo
    console.log('[criarInsumoAction] Criando insumo...');
    const insumo = await qServer.insumos.create({
      nome: parsed.nome,
      categoria_id: parsed.categoria_id,
      tipo_id: parsed.tipo_id,
      unidade: parsed.unidade,
      fornecedor: parsed.fornecedor,
      local_armazen: parsed.local_armazen,
      estoque_minimo: parsed.estoque_minimo,
      estoque_atual: parsed.quantidade_entrada,
      custo_medio: parsed.valor_unitario,
      data_cadastro: parsed.data,
      observacoes: parsed.observacoes,
      ativo: true,
    });

    // Criar movimentação de entrada
    const movimentacao = await qServer.movimentacoesInsumo.create({
      insumo_id: insumo.id,
      tipo: 'Entrada',
      quantidade: parsed.quantidade_entrada,
      valor_unitario: parsed.valor_unitario,
      data: new Date().toISOString().split('T')[0],
      origem: 'manual',
    });

    // Integração Financeiro: Se marcado, criar despesa automática
    let despesa_id: string | null = null;
    if (parsed.registrar_como_despesa) {
      try {
        const despesa = await qServer.financeiro.create({
          categoria: 'Insumos',
          descricao: `Entrada de ${insumo.nome}: ${parsed.quantidade_entrada} ${parsed.unidade}`,
          valor: parsed.quantidade_entrada * parsed.valor_unitario,
          data: new Date().toISOString().split('T')[0],
          tipo: 'Despesa',
          forma_pagamento: null,
          referencia_id: movimentacao.id,
          referencia_tipo: null,
        });

        despesa_id = despesa.id;

        // Linkar despesa à movimentação
        const supabaseServer = await createSupabaseServerClient();
        await supabaseServer
          .from('movimentacoes_insumo')
          .update({ despesa_id })
          .eq('id', movimentacao.id);
      } catch (despesaError) {
        // Se falhar ao criar despesa, reverter movimentação (transação atômica)
        console.error('Erro ao criar despesa. Revertendo movimentação.', despesaError);
        await qServer.movimentacoesInsumo.remove(movimentacao.id);
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
      const tipo = await qServer.tipos.getById(parsed.tipo_id);
      if (tipo.categoria_id !== parsed.categoria_id) {
        throw new Error('Tipo selecionado não pertence à categoria escolhida');
      }
    }

    const insumo = await qServer.insumos.update(id, {
      nome: parsed.nome,
      categoria_id: parsed.categoria_id,
      tipo_id: parsed.tipo_id,
      unidade: parsed.unidade,
      fornecedor: parsed.fornecedor,
      local_armazen: parsed.local_armazen,
      estoque_minimo: parsed.estoque_minimo,
      observacoes: parsed.observacoes,
    });

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
    await qServer.insumos.delete(id);
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
    const insumo = await qServer.insumos.getById(parsed.insumo_id);

    // Validar estoque
    if (insumo.estoque_atual < parsed.quantidade) {
      throw new Error(
        `Estoque insuficiente. Disponível: ${insumo.estoque_atual} ${insumo.unidade}, Solicitado: ${parsed.quantidade}`
      );
    }

    await qServer.movimentacoesInsumo.create({
      insumo_id: parsed.insumo_id,
      tipo: 'Saída',
      quantidade: parsed.quantidade,
      valor_unitario: parsed.valor_unitario || insumo.custo_medio,
      tipo_saida: parsed.tipo_saida,
      destino_tipo: parsed.destino_tipo,
      destino_id: parsed.destino_id,
      responsavel: parsed.responsavel,
      data: parsed.data,
      observacoes: parsed.observacoes,
      origem: 'manual',
    });

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
  try {
    console.log('[criarAjusteAction] Iniciando com dados:', formData);
    const parsed = ajusteInventarioSchema.parse(formData);
    console.log('[criarAjusteAction] Validação OK:', { insumo_id: parsed.insumo_id, estoque_real: parsed.estoque_real });

    // Validar que estoque_real seja um número válido
    if (typeof parsed.estoque_real !== 'number' || isNaN(parsed.estoque_real)) {
      throw new Error('Estoque real deve ser um número válido');
    }

    if (parsed.estoque_real < 0) {
      throw new Error('Estoque real não pode ser negativo');
    }

    const resultado = await qServer.movimentacoesInsumo.createAjuste(
      parsed.insumo_id,
      parsed.estoque_real,
      parsed.motivo
    );

    console.log('[criarAjusteAction] Ajuste criado:', resultado.id);
    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('[criarAjusteAction] Erro completo:', error);

    // Mensagem de erro mais específica
    if (error instanceof Error) {
      console.error('[criarAjusteAction] Mensagem:', error.message);
      console.error('[criarAjusteAction] Stack:', error.stack);
      throw new Error(`Ajuste falhou: ${error.message}`);
    }

    throw new Error('Erro desconhecido ao registrar ajuste');
  }
}
