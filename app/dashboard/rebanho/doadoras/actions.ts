'use server';

import { revalidatePath } from 'next/cache';
import { sou_admin } from '@/lib/auth/helpers';
import {
  criarDoadoraSchema,
  type CriarDoadoraInput,
} from '@/lib/validations/rebanho-reproducao';
import { queryDoadoras } from '@/lib/supabase/rebanho-doadoras';

function revalidarPaineis() {
  revalidatePath('/dashboard/rebanho/leiteira');
  revalidatePath('/dashboard/rebanho/corte');
}

export async function criarDoadoraAction(
  formData: unknown
): Promise<{ success: boolean; doadora_id?: string; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem criar doadoras.' };
    }

    const parsed = criarDoadoraSchema.parse(formData);
    const doadora = await queryDoadoras.create(parsed as CriarDoadoraInput);

    revalidarPaineis();
    return { success: true, doadora_id: doadora.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function editarDoadoraAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem editar doadoras.' };
    }

    const parsed = criarDoadoraSchema.parse(formData);
    await queryDoadoras.update(id, parsed as Partial<CriarDoadoraInput>);

    revalidarPaineis();
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function deletarDoadoraAction(
  id: string
): Promise<{ success: boolean; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem deletar doadoras.' };
    }

    await queryDoadoras.remove(id);

    revalidarPaineis();
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}
