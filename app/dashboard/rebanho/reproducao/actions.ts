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
import { queryReprodutores, queryParametrosReprodutivos } from '@/lib/supabase/rebanho-reproducao';

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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: parsed.animal_id,
        tipo: 'cobertura',
        data_evento: parsed.data_evento,
        tipo_cobertura: parsed.tipo_cobertura,
        reprodutor_id: parsed.reprodutor_id || null,
        observacoes: parsed.observacoes || null,
        usuario_id: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: data.id };
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: parsed.animal_id,
        tipo: 'diagnostico_prenhez',
        data_evento: parsed.data_evento,
        metodo: parsed.metodo,
        resultado: parsed.resultado,
        idade_gestacional_dias: parsed.idade_gestacional_dias || null,
        observacoes: parsed.observacoes || null,
        usuario_id: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: data.id };
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

    const supabase = await createSupabaseServerClient();

    // Validar prenhez confirmada
    const { count: prenheCount } = await supabase
      .from('eventos_rebanho')
      .select('id', { count: 'exact', head: true })
      .eq('animal_id', parsed.animal_id)
      .eq('tipo', 'diagnostico_prenhez')
      .eq('resultado', 'positivo')
      .gte('data_evento', new Date(new Date().setDate(new Date().getDate() - 295)).toISOString().split('T')[0]);

    const temPrenhez = (prenheCount || 0) > 0;

    if (!temPrenhez && !admin) {
      return {
        success: false,
        erro: 'Apenas administradores podem lançar parto sem prenhez confirmada.',
      };
    }

    // Chamar RPC para parto com transação
    const { data: resultado, error } = await supabase.rpc('rpc_lancar_parto', {
      p_animal_id: parsed.animal_id,
      p_data_evento: parsed.data_evento,
      p_tipo_parto: parsed.tipo_parto,
      p_usuario_id: userId,
      p_gemelar: parsed.gemelar || false,
      p_natimorto: parsed.natimorto || false,
      p_observacoes: parsed.observacoes || null,
      p_crias: parsed.crias || [],
    });

    if (error) throw new Error(error.message || 'Erro ao lançar parto');

    // RPC retorna SETOF/TABLE → data vem como array
    const registro = resultado?.[0];
    if (!registro) {
      throw new Error('RPC executou mas não retornou dados do parto.');
    }

    revalidatePath('/dashboard/rebanho/reproducao');
    return {
      success: true,
      evento_id: registro.evento_id,
      bezerros_criados: registro.bezerros_criados ?? 0,
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: parsed.animal_id,
        tipo: 'secagem',
        data_evento: parsed.data_evento,
        observacoes: parsed.observacoes || null,
        usuario_id: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: data.id };
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: parsed.animal_id,
        tipo: 'aborto',
        data_evento: parsed.data_evento,
        idade_gestacional_dias: parsed.idade_gestacional_dias || null,
        causa_aborto: parsed.causa_aborto || null,
        observacoes: parsed.observacoes || null,
        usuario_id: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: data.id };
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id: parsed.animal_id,
        tipo: 'descarte',
        data_evento: parsed.data_evento,
        motivo: parsed.motivo,
        observacoes: parsed.observacoes || null,
        usuario_id: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true, evento_id: data.id };
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
    const supabase = await createSupabaseServerClient();

    // Buscar evento para auditoria
    const { data: evento, error: getError } = await supabase
      .from('eventos_rebanho')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    // Soft delete
    const { error: deleteError } = await supabase
      .from('eventos_rebanho')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Registrar em audit_log
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

    await queryParametrosReprodutivos.update(profile.fazenda_id, parsed as AtualizarParametrosReprodutivosInput);

    revalidatePath('/dashboard/rebanho/reproducao');
    return { success: true };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, erro: mensagem };
  }
}
