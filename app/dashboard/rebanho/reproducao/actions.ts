'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sou_admin, sou_operador_ou_admin, getCurrentUserId } from '@/lib/auth/helpers';
import {
  criarReprodutorSchema,
  criarCoberturaSchema,
  criarDiagnosticoSchema,
  criarPartoSchema,
  criarSecagemSchema,
  criarAbortoSchema,
  criarDescarteSchema,
  atualizarParametrosReprodutivosSchema,
  type CriarReprodutorInput,
  type CriarCoberturaInput,
  type CriarDiagnosticoInput,
  type CriarPartoInput,
  type CriarSecagemInput,
  type CriarAbortoInput,
  type CriarDescarteInput,
  type AtualizarParametrosReprodutivosInput,
} from '@/lib/validations/rebanho-reproducao';
import {
  queryReprodutores,
  queryParametrosReprodutivos,
  queryEventosRebanho,
} from '@/lib/supabase/rebanho-reproducao';

// ========== REPRODUTOR ==========

export async function criarReprodutorAction(
  formData: unknown
): Promise<{ success: boolean; reprodutor_id?: string; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem criar reprodutores.' };
    }

    const parsed = criarReprodutorSchema.parse(formData);
    const reprodutor = await queryReprodutores.create(parsed as CriarReprodutorInput);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, reprodutor_id: reprodutor.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function editarReprodutorAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem editar reprodutores.' };
    }

    const parsed = criarReprodutorSchema.partial().parse(formData);
    await queryReprodutores.update(id, parsed as Partial<CriarReprodutorInput>);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function deletarReprodutorAction(id: string): Promise<{ success: boolean; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem deletar reprodutores.' };
    }

    await queryReprodutores.remove(id);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

// ========== EVENTOS REPRODUTIVOS ==========

export async function lancarCoberturaAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, erro: 'Permissão insuficiente para lançar cobertura.' };
    }

    const parsed = criarCoberturaSchema.parse(formData);
    const userId = await getCurrentUserId();

    const resultado = await queryEventosRebanho.registrarCobertura(parsed, userId);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function lancarDiagnosticoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, erro: 'Permissão insuficiente para lançar diagnóstico.' };
    }

    const parsed = criarDiagnosticoSchema.parse(formData);
    const userId = await getCurrentUserId();

    const resultado = await queryEventosRebanho.registrarDiagnostico(parsed, userId);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function lancarPartoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; bezerros_criados?: number; erro?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, erro: 'Permissão insuficiente para lançar parto.' };
    }

    const parsed = criarPartoSchema.parse(formData);
    const userId = await getCurrentUserId();
    const admin = await sou_admin();

    // Validar prenhez confirmada nos últimos 295 dias
    const ultimoDiag = await queryEventosRebanho.getUltimoDiagnosticoPositivo(parsed.animal_id, 295);
    const temPrenhez = !!ultimoDiag;

    if (!temPrenhez && !admin) {
      return {
        success: false,
        erro: 'Apenas administradores podem lançar parto sem prenhez confirmada.',
      };
    }

    // RPC orquestra parto + crias em transação atômica
    const resultado = await queryEventosRebanho.registrarParto(parsed, userId);

    revalidatePath('/dashboard/rebanho/reproducao');
    return {
      success: true,
      evento_id: resultado.evento_id,
      bezerros_criados: resultado.bezerros_criados,
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function lancarSecagemAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, erro: 'Permissão insuficiente para lançar secagem.' };
    }

    const parsed = criarSecagemSchema.parse(formData);
    const userId = await getCurrentUserId();

    const resultado = await queryEventosRebanho.registrarSecagem(parsed, userId);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function lancarAbortoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, erro: 'Permissão insuficiente para lançar aborto.' };
    }

    const parsed = criarAbortoSchema.parse(formData);
    const userId = await getCurrentUserId();

    const resultado = await queryEventosRebanho.registrarAborto(parsed, userId);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function lancarDescarteAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }> {
  try {
    const podeOperar = await sou_operador_ou_admin();
    if (!podeOperar) {
      return { success: false, erro: 'Permissão insuficiente para lançar descarte.' };
    }

    const parsed = criarDescarteSchema.parse(formData);
    const userId = await getCurrentUserId();

    const resultado = await queryEventosRebanho.registrarDescarte(parsed, userId);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: resultado.id };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

export async function deletarEventoReprodutivo(id: string): Promise<{ success: boolean; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem deletar eventos reprodutivos.' };
    }

    const userId = await getCurrentUserId();

    // Buscar evento para auditoria
    const evento = await queryEventosRebanho.getById(id);
    if (!evento) {
      return { success: false, erro: 'Evento não encontrado.' };
    }

    // Soft delete
    await queryEventosRebanho.softDelete(id);

    // Registrar em audit_log
    const supabase = await createSupabaseServerClient();
    await supabase.from('audit_log').insert({
      tabela: 'eventos_rebanho',
      registro_id: id,
      acao: 'delete',
      payload_anterior: evento,
      usuario_id: userId,
    });

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}

// ========== PARÂMETROS ==========

export async function atualizarParametrosReprodutivosAction(
  formData: unknown
): Promise<{ success: boolean; erro?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, erro: 'Apenas administradores podem atualizar parâmetros reprodutivos.' };
    }

    const parsed = atualizarParametrosReprodutivosSchema.parse(formData);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado.');

    const { data: profile } = await supabase.from('profiles').select('fazenda_id').eq('id', user.id).single();

    if (!profile?.fazenda_id) throw new Error('Fazenda não encontrada.');

    // Upsert para criar ou atualizar parâmetros
    await queryParametrosReprodutivos.upsert(profile.fazenda_id, parsed as AtualizarParametrosReprodutivosInput);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}
