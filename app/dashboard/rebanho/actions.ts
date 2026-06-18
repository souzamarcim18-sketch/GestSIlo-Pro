'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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
  validarAnimaisCSV,
  cadastrarAnimaisLote,
  mudarCategoriaAnimalAction as mudarCategoriaAnimal,
} from '@/lib/supabase/rebanho';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TipoEvento } from '@/lib/types/rebanho';
import type { CSVImportResult, CSVValidacaoResult } from '@/lib/types/rebanho';

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
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
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
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
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

export async function mudarCategoriaAction(
  id: string,
  novaCategoria: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await mudarCategoriaAnimal(id, novaCategoria);
    revalidatePath(`/dashboard/rebanho/${id}`);
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
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
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
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
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
        tipo: TipoEvento.TRANSFERENCIA_LOTE,
        data_evento: new Date().toISOString().split('T')[0],
        lote_id_destino,
      } as CriarEventoInput);
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
  animal_id: string,
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; error?: string }> {
  try {
    const parsed = criarEventoSchema.parse(formData);
    const supabase = await createSupabaseServerClient();

    // Atomicamente insere o evento e, quando aplicável, atualiza animais.status
    const { data, error } = await supabase.rpc('registrar_evento_com_status', {
      p_animal_id: animal_id,
      p_payload: parsed,
    });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/rebanho');
    revalidatePath(`/dashboard/rebanho/${animal_id}`);
    revalidatePath('/dashboard/rebanho/indicadores');
    revalidatePath('/dashboard/rebanho/movimentacoes');

    return { success: true, evento_id: data as string };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}

// ========== IMPORTAÇÃO CSV ==========

/**
 * Pré-valida o CSV sem gravar nada (dry-run) para alimentar a tela de revisão.
 * Em caso de falha geral, retorna um resultado com erro na linha 0.
 */
export async function validarCSVAction(
  formData: FormData
): Promise<CSVValidacaoResult> {
  try {
    const arquivo = formData.get('arquivo') as File | null;

    if (!arquivo) {
      return {
        total_linhas: 0,
        validos: 0,
        com_erro: 1,
        duplicados_arquivo: 0,
        duplicados_banco: 0,
        linhas: [
          {
            linha: 0,
            brinco: '',
            sexo: '',
            data_nascimento: '',
            tipo_rebanho: '',
            status: 'erro',
            mensagem: 'Arquivo não fornecido',
          },
        ],
      };
    }

    const arquivoValido = importarCSVSchema.shape.arquivo.parse(arquivo);
    return await validarAnimaisCSV(arquivoValido);
  } catch (error) {
    const mensagem =
      error instanceof z.ZodError
        ? error.issues.map((e) => e.message).join('; ')
        : error instanceof Error
          ? error.message
          : 'Erro desconhecido';
    return {
      total_linhas: 0,
      validos: 0,
      com_erro: 1,
      duplicados_arquivo: 0,
      duplicados_banco: 0,
      linhas: [
        {
          linha: 0,
          brinco: '',
          sexo: '',
          data_nascimento: '',
          tipo_rebanho: '',
          status: 'erro',
          mensagem,
        },
      ],
    };
  }
}

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

// ========== CADASTRO EM LOTE (GRADE) ==========

const cadastroGradeSchema = z.object({
  linhas: z
    .array(z.record(z.string(), z.string()))
    .min(1, 'Adicione ao menos uma linha')
    .max(500, 'Máximo 500 animais por vez'),
});

/**
 * Cadastro em massa via grade editável (sem planilha). Recebe as linhas
 * digitadas na tela e reaproveita o núcleo de validação/inserção do CSV.
 */
export async function cadastrarAnimaisLoteAction(
  input: unknown
): Promise<CSVImportResult> {
  try {
    const { linhas } = cadastroGradeSchema.parse(input);
    const resultado = await cadastrarAnimaisLote(linhas);
    revalidatePath('/dashboard/rebanho');
    return resultado;
  } catch (error) {
    const mensagem =
      error instanceof z.ZodError
        ? error.issues.map((e) => e.message).join('; ')
        : error instanceof Error
          ? error.message
          : 'Erro desconhecido';
    return {
      total_linhas: 0,
      importados: 0,
      erros: [{ linha: 0, brinco: '', status: 'erro', mensagem }],
    };
  }
}
