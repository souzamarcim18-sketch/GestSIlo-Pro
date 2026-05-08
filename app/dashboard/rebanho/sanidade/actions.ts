'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import {
  criarEventoSanitario,
  editarEventoSanitario,
  deletarEventoSanitario,
} from '@/lib/supabase/rebanho-sanitario';
import { criarEventoSanitarioSchema } from '@/lib/validations/rebanho';
import type { EventoSanitarioRow, EventoSanitarioInput } from '@/lib/types/rebanho-sanitario';

export async function criarEventoSanitarioAction(
  formData: unknown,
  animalIdOverride?: string
): Promise<{
  success: boolean;
  data?: EventoSanitarioRow | EventoSanitarioRow[];
  error?: string;
}> {
  try {
    const parsed = criarEventoSanitarioSchema.parse(formData) as EventoSanitarioInput;

    // Suportar seleção de múltiplos animais enviados pelo formulário
    const rawAnimalId: string | string[] = parsed.animal_id;
    const animalIds: string[] = Array.isArray(rawAnimalId)
      ? rawAnimalId
      : [animalIdOverride || rawAnimalId];

    if (animalIds.length === 0) {
      return { success: false, error: 'Selecione ao menos um animal' };
    }

    const eventos = await Promise.all(
      animalIds.map((animalId: string) =>
        criarEventoSanitario({
          ...parsed,
          animal_id: animalId,
        })
      )
    );

    revalidatePath('/dashboard/rebanho/sanidade');
    revalidatePath('/dashboard/rebanho/[id]');

    return {
      success: true,
      data: eventos.length === 1 ? eventos[0] : eventos,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function editarEventoSanitarioAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; data?: EventoSanitarioRow; error?: string }> {
  try {
    const parsed = formData as Partial<EventoSanitarioInput>;
    const resultado = await editarEventoSanitario(id, parsed);

    revalidatePath('/dashboard/rebanho/sanidade');
    revalidatePath('/dashboard/rebanho/[id]');

    return { success: true, data: resultado };
  } catch (error) {
    if (error instanceof ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function deletarEventoSanitarioAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deletarEventoSanitario(id);

    revalidatePath('/dashboard/rebanho/sanidade');
    revalidatePath('/dashboard/rebanho/[id]');

    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}
