'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sou_admin, sou_operador_ou_admin } from '@/lib/auth/helpers';
import {
  criarProducaoLeiteira,
  editarProducaoLeiteira,
  deletarProducaoLeiteira,
} from '@/lib/supabase/rebanho-leiteira';
import { criarProducaoLeiteiraSchema } from '@/lib/validations/rebanho';
import type { CriarProducaoLeiteiraInput } from '@/lib/validations/rebanho';
import type { ProducaoLeiteiraInput } from '@/lib/types/rebanho-leiteira';

// ========== CRIAR PRODUÇÃO LEITEIRA ==========

export async function criarProducaoLeiteiraAction(
  formData: unknown
): Promise<{ success: boolean; producao_id?: string; error?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, error: 'Permissão insuficiente para registrar produção.' };
    }

    const parsed = criarProducaoLeiteiraSchema.parse(formData);
    const producao = await criarProducaoLeiteira(parsed as ProducaoLeiteiraInput);

    revalidatePath('/dashboard/rebanho/leiteira');
    revalidatePath('/dashboard/rebanho/[id]');
    return { success: true, producao_id: producao.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e: any) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

// ========== EDITAR PRODUÇÃO LEITEIRA ==========

export async function editarProducaoLeiteiraAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, error: 'Permissão insuficiente para editar produção.' };
    }

    const schema = z.object({
      volume_litros: z.number().positive('Volume deve ser > 0').max(100).optional(),
      turno: z.enum(['manha', 'tarde', 'noite', 'dia_inteiro']).optional(),
      observacoes: z.string().optional().nullable(),
    });

    const parsed = schema.parse(formData);
    await editarProducaoLeiteira(id, parsed);

    revalidatePath('/dashboard/rebanho/leiteira');
    revalidatePath('/dashboard/rebanho/[id]');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e: any) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

// ========== DELETAR PRODUÇÃO LEITEIRA ==========

export async function deletarProducaoLeiteiraAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, error: 'Apenas administradores podem deletar produções.' };
    }

    await deletarProducaoLeiteira(id);

    revalidatePath('/dashboard/rebanho/leiteira');
    revalidatePath('/dashboard/rebanho/[id]');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}
