'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
import { animais, lotes, eventos, importacao } from '@/lib/supabase/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';
import type { CSVImportResult } from '@/lib/types/rebanho';

// ========== ANIMAIS ==========

/**
 * Cria um novo animal na fazenda do usuário.
 * Valida com Zod e aplica RLS no servidor.
 */
export async function criarAnimalAction(
  formData: unknown
): Promise<{ success: boolean; animal_id?: string; erro?: string }> {
  try {
    const parsed = criarAnimalSchema.parse(formData);
    const animal = await animais.create(parsed as CriarAnimalInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true, animal_id: animal.id };
  } catch (error) {
    console.error('[criarAnimalAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

/**
 * Edita um animal existente.
 * Recalcula categoria se data_nascimento mudar (trigger SQL cuida disso).
 */
export async function editarAnimalAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; erro?: string }> {
  try {
    const parsed = editarAnimalSchema.parse(formData);
    await animais.update(id, parsed);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    console.error('[editarAnimalAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

/**
 * Soft delete de um animal (apenas admin).
 * Bloqueia se animal tiver eventos.
 */
export async function deletarAnimalAction(
  id: string
): Promise<{ success: boolean; erro?: string }> {
  try {
    // Verificar perfil
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, erro: 'Usuário não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (profile?.perfil !== 'Administrador') {
      return { success: false, erro: 'Apenas administradores podem deletar animais' };
    }

    await animais.remove(id);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    console.error('[deletarAnimalAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

// ========== LOTES ==========

/**
 * Cria um novo lote na fazenda.
 */
export async function criarLoteAction(
  formData: unknown
): Promise<{ success: boolean; lote_id?: string; erro?: string }> {
  try {
    const parsed = criarLoteSchema.parse(formData);
    const lote = await lotes.create({
      nome: parsed.nome,
      descricao: parsed.descricao || null,
    });
    revalidatePath('/dashboard/rebanho');
    return { success: true, lote_id: lote.id };
  } catch (error) {
    console.error('[criarLoteAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

/**
 * Edita lote existente.
 */
export async function editarLoteAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; erro?: string }> {
  try {
    const parsed = editarLoteSchema.parse(formData);
    await lotes.update(id, {
      nome: parsed.nome,
      descricao: parsed.descricao || null,
    });
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    console.error('[editarLoteAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

/**
 * Deleta lote (apenas admin).
 * Bloqueia se tiver animais ativos.
 */
export async function deletarLoteAction(
  id: string
): Promise<{ success: boolean; erro?: string }> {
  try {
    // Verificar perfil
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, erro: 'Usuário não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (profile?.perfil !== 'Administrador') {
      return { success: false, erro: 'Apenas administradores podem deletar lotes' };
    }

    await lotes.remove(id);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    console.error('[deletarLoteAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

/**
 * Transfere múltiplos animais entre lotes.
 * Cria evento de tipo "transferencia_lote" para cada animal.
 */
export async function transferirAnimaisEmMassaAction(
  animal_ids: string[],
  lote_id_destino: string
): Promise<{ success: boolean; transferidos?: number; erro?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, erro: 'Usuário não autenticado' };
    }

    let transferidos = 0;

    for (const animal_id of animal_ids) {
      await eventos.create({
        animal_id,
        tipo: TipoEvento.TRANSFERENCIA_LOTE,
        data_evento: new Date().toISOString().split('T')[0],
        lote_id_destino,
        usuario_id: user.id,
      });
      transferidos++;
    }

    revalidatePath('/dashboard/rebanho');
    return { success: true, transferidos };
  } catch (error) {
    console.error('[transferirAnimaisEmMassaAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

// ========== EVENTOS ==========

/**
 * Lança um novo evento (nascimento, pesagem, morte, venda, transferência).
 * Dispara triggers para atualizar status, peso_atual, lote_id conforme tipo.
 */
export async function lancarEventoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, erro: 'Usuário não autenticado' };
    }

    const parsed = criarEventoSchema.parse(formData);
    const evento = await eventos.create({
      ...(parsed as CriarEventoInput),
      usuario_id: user.id,
    });

    revalidatePath('/dashboard/rebanho');
    return { success: true, evento_id: evento.id };
  } catch (error) {
    console.error('[lancarEventoAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

/**
 * Soft delete de evento (apenas admin).
 */
export async function deletarEventoAction(
  id: string
): Promise<{ success: boolean; erro?: string }> {
  try {
    // Verificar perfil
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, erro: 'Usuário não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (profile?.perfil !== 'Administrador') {
      return { success: false, erro: 'Apenas administradores podem deletar eventos' };
    }

    await eventos.remove(id);
    revalidatePath('/dashboard/rebanho');
    return { success: true };
  } catch (error) {
    console.error('[deletarEventoAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

// ========== IMPORTAÇÃO CSV ==========

/**
 * Processa importação de CSV.
 * Valida cada linha, cria lote automaticamente se necessário,
 * bulk inserts animais, cria evento de "nascimento" para cada.
 * Retorna relatório com erros (se houver).
 */
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
            numero_animal: '',
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

    const resultado = await importacao.importarCSV(
      validacao.arquivo,
      validacao.criar_lote_automatico
    );

    revalidatePath('/dashboard/rebanho');
    return resultado;
  } catch (error) {
    console.error('[importarCSVAction]', error);
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      total_linhas: 0,
      importados: 0,
      erros: [
        {
          linha: 0,
          numero_animal: '',
          status: 'erro',
          mensagem,
        },
      ],
    };
  }
}

/**
 * Gera relatório de erros da importação em CSV.
 */
export async function gerarRelatorioErrosImportacao(
  erros: { linha: number; numero_animal: string; mensagem: string }[]
): Promise<Blob> {
  const csv = [
    ['Linha', 'Número do Animal', 'Erro'].join(','),
    ...erros.map((e) => [e.linha, e.numero_animal, `"${e.mensagem}"`].join(',')),
  ].join('\n');

  return new Blob([csv], { type: 'text/csv' });
}
