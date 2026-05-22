'use server';

import { createSupabaseServerClient } from './server';
import type { ReferenciaTipo } from '@/lib/types/registros-colaborador';

/**
 * Vincula ou troca o colaborador de uma operação.
 * - colaboradorId = string → DELETE anterior (se existir) + INSERT novo
 * - colaboradorId = null → apenas DELETE (remove vínculo)
 * Falhas não lançam exceção — são logadas. A operação pai já foi persistida.
 */
export async function upsertRegistroColaborador(
  tipo: ReferenciaTipo,
  referenciaId: string,
  colaboradorId: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from('registros_colaborador')
    .delete()
    .eq('referencia_tipo', tipo)
    .eq('referencia_id', referenciaId);

  if (deleteError) {
    console.error('[registros_colaborador] Erro ao remover vínculo anterior:', deleteError);
  }

  if (!colaboradorId) return;

  const { error: insertError } = await supabase
    .from('registros_colaborador')
    .insert({
      colaborador_id: colaboradorId,
      referencia_tipo: tipo,
      referencia_id: referenciaId,
    });

  if (insertError) {
    console.error('[registros_colaborador] Erro ao inserir vínculo:', insertError);
  }
}

/**
 * Remove o vínculo de colaborador de uma operação.
 * Chamado ao deletar a operação pai. Falhas são logadas, nunca lançadas.
 */
export async function deleteRegistroColaborador(
  tipo: ReferenciaTipo,
  referenciaId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('registros_colaborador')
    .delete()
    .eq('referencia_tipo', tipo)
    .eq('referencia_id', referenciaId);

  if (error) {
    console.error('[registros_colaborador] Erro ao limpar vínculo:', error);
  }
}

/**
 * Retorna o colaborador_id vinculado a uma operação, ou null se não houver.
 * Usado para pré-popular o select em formulários de edição.
 */
export async function getColaboradorDaOperacao(
  tipo: ReferenciaTipo,
  referenciaId: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('registros_colaborador')
    .select('colaborador_id')
    .eq('referencia_tipo', tipo)
    .eq('referencia_id', referenciaId)
    .maybeSingle();

  return data?.colaborador_id ?? null;
}

/**
 * Lista colaboradores ativos da fazenda para popular selects.
 * Reutiliza RLS de `colaboradores` (fazenda_id via JWT).
 */
export async function listColaboradoresAtivosParaSelect(): Promise<
  { id: string; nome: string; funcao: string }[]
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, funcao')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('[registros_colaborador] Erro ao listar colaboradores:', error);
    return [];
  }

  return data ?? [];
}
