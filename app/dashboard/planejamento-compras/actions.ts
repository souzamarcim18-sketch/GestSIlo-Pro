'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sou_admin, getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  planejamentoAtividadeSchema,
  planejamentoInsumoSchema,
  atualizarQuantidadeInsumoSchema,
  marcarComoCompradoSchema,
  type PlanejamentoAtividadeInput,
  type PlanejamentoInsumoInput,
  type MarcarComoCompradoInput,
} from '@/lib/validations/planejamento-compras';
import type { PlanejamentoAtividade, PlanejamentoInsumoComInsumo } from '@/lib/types/planejamento-compras';

const APENAS_ADMIN = 'Apenas administradores podem executar esta ação';

// ─── 6.1 Criar planejamento ───────────────────────────────────────────────────

export async function criarPlanejamentoAction(
  formData: unknown
): Promise<{ data: PlanejamentoAtividade } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const parsed = planejamentoAtividadeSchema.parse(formData) as PlanejamentoAtividadeInput;
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getCurrentFazendaId();

    // Confirmar que talhão pertence à fazenda
    const { data: talhao, error: talhaoError } = await supabase
      .from('talhoes')
      .select('id')
      .eq('id', parsed.talhao_id)
      .eq('fazenda_id', fazendaId)
      .single();

    if (talhaoError || !talhao) {
      return { error: 'Talhão não encontrado ou não pertence à sua fazenda' };
    }

    const { data, error } = await supabase
      .from('planejamentos_atividade')
      .insert({
        talhao_id: parsed.talhao_id,
        ciclo_id: parsed.ciclo_id ?? null,
        tipo_operacao: parsed.tipo_operacao,
        data_prevista: parsed.data_prevista,
        observacoes: parsed.observacoes ?? null,
      })
      .select('id, talhao_id, ciclo_id, tipo_operacao, data_prevista, status, observacoes, fazenda_id, created_by, created_at, updated_at')
      .single();

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    return { data: data as PlanejamentoAtividade };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.2 Atualizar planejamento ───────────────────────────────────────────────

export async function atualizarPlanejamentoAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const parsed = planejamentoAtividadeSchema.parse(formData) as PlanejamentoAtividadeInput;
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('planejamentos_atividade')
      .update({
        talhao_id: parsed.talhao_id,
        ciclo_id: parsed.ciclo_id ?? null,
        tipo_operacao: parsed.tipo_operacao,
        data_prevista: parsed.data_prevista,
        observacoes: parsed.observacoes ?? null,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    revalidatePath(`/dashboard/planejamento-compras/${id}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.3 Cancelar planejamento ────────────────────────────────────────────────

export async function cancelarPlanejamentoAction(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const supabase = await createSupabaseServerClient();

    // Bloquear cancelamento de atividade já executada
    const { data: atual, error: fetchError } = await supabase
      .from('planejamentos_atividade')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !atual) return { error: 'Planejamento não encontrado' };
    if (atual.status === 'executada') {
      return { error: 'Não é possível cancelar uma atividade já executada' };
    }

    const { error } = await supabase
      .from('planejamentos_atividade')
      .update({ status: 'cancelada' })
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.4 Excluir planejamento ────────────────────────────────────────────────

export async function excluirPlanejamentoAction(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('planejamentos_atividade')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.5 Adicionar insumo ao planejamento ────────────────────────────────────

export async function adicionarInsumoAoPlanejamentoAction(
  formData: unknown
): Promise<{ data: PlanejamentoInsumoComInsumo } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const parsed = planejamentoInsumoSchema.parse(formData) as PlanejamentoInsumoInput;
    const supabase = await createSupabaseServerClient();

    // Validar que insumo está ativo
    const { data: insumo, error: insumoError } = await supabase
      .from('insumos')
      .select('id, ativo')
      .eq('id', parsed.insumo_id)
      .single();

    if (insumoError || !insumo) return { error: 'Insumo não encontrado' };
    if (!insumo.ativo) return { error: 'Não é possível vincular um insumo inativo' };

    const { data, error } = await supabase
      .from('planejamento_insumos')
      .insert({
        planejamento_id: parsed.planejamento_id,
        insumo_id: parsed.insumo_id,
        quantidade: parsed.quantidade,
      })
      .select('id, planejamento_id, insumo_id, quantidade, fazenda_id, created_at, insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)')
      .single();

    if (error) {
      if (error.code === '23505') return { error: 'Insumo já adicionado a este planejamento' };
      return { error: error.message };
    }

    revalidatePath(`/dashboard/planejamento-compras/${parsed.planejamento_id}`);
    return { data: data as unknown as PlanejamentoInsumoComInsumo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.6 Remover insumo do planejamento ──────────────────────────────────────

export async function removerInsumoDoPlanejamentoAction(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('planejamento_insumos')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.7 Atualizar quantidade de insumo ──────────────────────────────────────

export async function atualizarQuantidadeInsumoAction(
  formData: unknown
): Promise<{ success: boolean } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const parsed = atualizarQuantidadeInsumoSchema.parse(formData);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('planejamento_insumos')
      .update({ quantidade: parsed.quantidade })
      .eq('id', parsed.id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}

// ─── 6.10 Marcar como comprado ───────────────────────────────────────────────

export async function marcarComoCompradoAction(
  formData: unknown
): Promise<{ success: boolean } | { error: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) return { error: APENAS_ADMIN };

    const parsed = marcarComoCompradoSchema.parse(formData) as MarcarComoCompradoInput;
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getCurrentFazendaId();

    // Confirmar que insumo pertence à fazenda do usuário
    const { data: insumo, error: insumoError } = await supabase
      .from('insumos')
      .select('id')
      .eq('id', parsed.insumo_id)
      .eq('fazenda_id', fazendaId)
      .single();

    if (insumoError || !insumo) {
      return { error: 'Insumo não encontrado ou não pertence à sua fazenda' };
    }

    // Inserir entrada em movimentacoes_insumo
    // O trigger atualizar_custo_medio_e_estoque() dispara automaticamente após INSERT
    const { error } = await supabase
      .from('movimentacoes_insumo')
      .insert({
        insumo_id: parsed.insumo_id,
        tipo: 'Entrada',
        quantidade: parsed.quantidade_comprada,
        data: parsed.data_compra,
        valor_unitario: parsed.valor_unitario_pago ?? null,
        origem: 'planejamento',
        observacoes: 'Compra para planejamento de atividades',
      });

    if (error) return { error: error.message };

    revalidatePath('/dashboard/planejamento-compras');
    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { error: msg };
  }
}
