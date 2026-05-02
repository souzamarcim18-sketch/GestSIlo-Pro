'use server';

import { revalidatePath } from 'next/cache';
import {
  criarAnimalSchema,
  editarAnimalSchema,
  criarLoteSchema,
  editarLoteSchema,
  criarEventoSchema,
  importarCSVSchema,
  type CriarAnimalInput,
  type EditarAnimalInput,
  type CriarLoteInput,
  type EditarLoteInput,
  type CriarEventoInput,
  type ImportarCSVInput,
} from '@/lib/validations/rebanho';
import {
  criarAnimal,
  editarAnimal,
  deletarAnimal,
  criarLote,
  editarLote,
  deletarLote,
  registrarEvento,
  importarAnimaisCSV,
} from '@/lib/supabase/rebanho';
import type { CSVImportResult } from '@/lib/types/rebanho';
import { toast } from 'sonner';

// ========== ANIMAIS ==========

export async function criarAnimalAction(
  formData: unknown
): Promise<{ success: boolean; animal_id?: string; error?: string }> {
  try {
    const parsed = criarAnimalSchema.parse(formData);
    const resultado = await criarAnimal(parsed as CriarAnimalInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true, animal_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function editarAnimalAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = editarAnimalSchema.parse(formData);
    await editarAnimal(id, parsed as EditarAnimalInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function deletarAnimalAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deletarAnimal(id);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

// ========== LOTES ==========

export async function criarLoteAction(
  formData: unknown
): Promise<{ success: boolean; lote_id?: string; error?: string }> {
  try {
    const parsed = criarLoteSchema.parse(formData);
    const resultado = await criarLote(parsed as CriarLoteInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true, lote_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function editarLoteAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = editarLoteSchema.parse(formData);
    await editarLote(id, parsed as EditarLoteInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function deletarLoteAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deletarLote(id);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

export async function transferirAnimaisAction(
  animal_ids: string[],
  lote_id_destino: string
): Promise<{ success: boolean; transferidos?: number; error?: string }> {
  try {
    let transferidos = 0;

    for (const animal_id of animal_ids) {
      await registrarEvento({
        animal_id,
        tipo: 'transferencia_lote',
        data_evento: new Date().toISOString().split('T')[0],
        lote_id_destino,
      } as any);
      transferidos++;
    }

    revalidatePath('/dashboard/rebanho');
    return { success: true, transferidos };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

// ========== EVENTOS ==========

export async function registrarEventoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; error?: string }> {
  try {
    const parsed = criarEventoSchema.parse(formData);
    const resultado = await registrarEvento(parsed as CriarEventoInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true, evento_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

// ========== IMPORTAÇÃO CSV ==========

export async function importarCSVAction(
  formData: FormData
): Promise<CSVImportResult> {
  try {
    const arquivo = formData.get('arquivo') as File | null;
    const criarLoteAutomatico = formData.get('criar_lote_automatico') === 'true';

    if (!arquivo) {
      return {
        total_linhas: 0,
        importados: 0,
        erros: [
          {
            linha: 0,
            brinco: '',
            status: 'erro',
            mensagem: 'Arquivo não fornecido',
          },
        ],
      };
    }

    const validacao = importarCSVSchema.parse({
      arquivo,
      criar_lote_automatico: criarLoteAutomatico,
    });

    const resultado = await importarAnimaisCSV(
      validacao.arquivo,
      validacao.criar_lote_automatico
    );

    revalidatePath('/dashboard/rebanho');
    return resultado;
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      total_linhas: 0,
      importados: 0,
      erros: [
        {
          linha: 0,
          brinco: '',
          status: 'erro',
          mensagem,
        },
      ],
    };
  }
}
