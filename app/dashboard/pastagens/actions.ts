'use server';

import { revalidatePath } from 'next/cache';
import {
  createPastagem,
  updatePastagem,
  deletePastagem,
  hasOcupacaoAbertaNaPastagem,
  createPiquete,
  updatePiquete,
  deletePiquete,
  hasOcupacaoAbertaNoPiquete,
  createOcupacao,
  getOcupacaoById,
  updateOcupacao,
  createEventoManejo,
  deleteEventoManejo,
  calcularUADoLote,
  getPiqueteById,
} from '@/lib/supabase/pastagens';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  pastagemFormSchema,
  piqueteFormSchema,
  ocupacaoFormSchema,
  fecharOcupacaoSchema,
  atualizarStatusPiqueteSchema,
  eventoManejoFormSchema,
  type PastagemFormData,
  type PiqueteFormData,
  type OcupacaoFormData,
  type FecharOcupacaoData,
  type EventoManejoFormData,
} from '@/lib/validations/pastagens';
import { upsertRegistroColaborador, deleteRegistroColaborador } from '@/lib/supabase/registros-colaborador';

type ActionResult = { success: true } | { success: false; error: string };

function revalidate() {
  revalidatePath('/dashboard/pastagens');
  revalidatePath('/dashboard');
}

// ─── Pastagens ───────────────────────────────────────────────────────────────

export async function criarPastagemAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = pastagemFormSchema.parse(formData);

    const pastagem = await createPastagem({
      nome: parsed.nome,
      especie_forrageira: parsed.especie_forrageira ?? null,
      area_total_ha: parsed.area_total_ha,
      sistema_pastejo: parsed.sistema_pastejo,
      observacoes: parsed.observacoes ?? null,
      ativo: true,
    });

    // Sistema contínuo → cria piquete único cobrindo toda a área da pastagem
    if (parsed.sistema_pastejo === 'continuo') {
      await createPiquete({
        pastagem_id: pastagem.id,
        nome: parsed.nome,
        area_ha: parsed.area_total_ha,
        status: 'Descanso',
        ua_suportada: null,
        dias_descanso_ideal: null,
        altura_entrada_cm: null,
        altura_saida_cm: null,
        observacoes: 'Piquete único — sistema de pastejo contínuo',
      });
    }

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar pastagem.';
    return { success: false, error: msg };
  }
}

export async function atualizarPastagemAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const parsed = pastagemFormSchema.parse(formData);

    await updatePastagem(id, {
      nome: parsed.nome,
      especie_forrageira: parsed.especie_forrageira ?? null,
      area_total_ha: parsed.area_total_ha,
      sistema_pastejo: parsed.sistema_pastejo,
      observacoes: parsed.observacoes ?? null,
    });

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar pastagem.';
    return { success: false, error: msg };
  }
}

export async function deletarPastagemAction(id: string): Promise<ActionResult> {
  try {
    const temOcupacaoAberta = await hasOcupacaoAbertaNaPastagem(id);
    if (temOcupacaoAberta) {
      return { success: false, error: 'Não é possível excluir pastagem com piquetes em pastejo.' };
    }

    await deletePastagem(id);
    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir pastagem.';
    return { success: false, error: msg };
  }
}

// ─── Piquetes ─────────────────────────────────────────────────────────────────

export async function criarPiqueteAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = piqueteFormSchema.parse(formData);

    await createPiquete({
      pastagem_id: parsed.pastagem_id,
      nome: parsed.nome,
      area_ha: parsed.area_ha,
      ua_suportada: parsed.ua_suportada ?? null,
      dias_descanso_ideal: parsed.dias_descanso_ideal ?? null,
      altura_entrada_cm: parsed.altura_entrada_cm ?? null,
      altura_saida_cm: parsed.altura_saida_cm ?? null,
      observacoes: parsed.observacoes ?? null,
    });

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar piquete.';
    return { success: false, error: msg };
  }
}

export async function atualizarPiqueteAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const parsed = piqueteFormSchema.parse(formData);

    await updatePiquete(id, {
      pastagem_id: parsed.pastagem_id,
      nome: parsed.nome,
      area_ha: parsed.area_ha,
      ua_suportada: parsed.ua_suportada ?? null,
      dias_descanso_ideal: parsed.dias_descanso_ideal ?? null,
      altura_entrada_cm: parsed.altura_entrada_cm ?? null,
      altura_saida_cm: parsed.altura_saida_cm ?? null,
      observacoes: parsed.observacoes ?? null,
    });

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar piquete.';
    return { success: false, error: msg };
  }
}

export async function deletarPiqueteAction(id: string): Promise<ActionResult> {
  try {
    const temOcupacaoAberta = await hasOcupacaoAbertaNoPiquete(id);
    if (temOcupacaoAberta) {
      return {
        success: false,
        error: 'Não é possível excluir piquete em pastejo. Feche a ocupação primeiro.',
      };
    }

    await deletePiquete(id);
    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir piquete.';
    return { success: false, error: msg };
  }
}

export async function atualizarStatusPiqueteAction(
  id: string,
  statusInput: unknown,
): Promise<ActionResult> {
  try {
    const { status } = atualizarStatusPiqueteSchema.parse({ status: statusInput });

    if (status === 'Em pastejo') {
      const temOcupacaoAberta = await hasOcupacaoAbertaNoPiquete(id);
      if (!temOcupacaoAberta) {
        return {
          success: false,
          error: "Use 'Registrar Entrada de Lote' para colocar o piquete em pastejo.",
        };
      }
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('piquetes')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar status do piquete.';
    return { success: false, error: msg };
  }
}

// ─── Ocupações ───────────────────────────────────────────────────────────────

export async function registrarEntradaLoteAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = ocupacaoFormSchema.parse(formData);

    const hoje = new Date().toISOString().split('T')[0];
    if (parsed.data_entrada > hoje) {
      return { success: false, error: 'Data de entrada não pode ser futura.' };
    }

    const piquete = await getPiqueteById(parsed.piquete_id);

    if (piquete.status === 'Em reforma') {
      return { success: false, error: 'Piquete em reforma não pode receber lote.' };
    }
    if (piquete.status === 'Interditado') {
      return { success: false, error: 'Piquete interditado não pode receber lote.' };
    }

    const temOcupacaoAberta = await hasOcupacaoAbertaNoPiquete(parsed.piquete_id);
    if (temOcupacaoAberta) {
      return { success: false, error: 'Piquete já está em pastejo.' };
    }

    // Recalcular UA no servidor para garantir consistência
    const ua = await calcularUADoLote(parsed.lote_id, piquete.area_ha);

    await createOcupacao({
      piquete_id: parsed.piquete_id,
      lote_id: parsed.lote_id,
      data_entrada: parsed.data_entrada,
      data_saida_prevista: parsed.data_saida_prevista ?? null,
      altura_dossel_entrada_cm: parsed.altura_dossel_entrada_cm ?? null,
      observacoes: parsed.observacoes ?? null,
      quantidade_animais: ua.quantidade_animais > 0 ? ua.quantidade_animais : null,
      peso_medio_kg: ua.peso_medio_kg > 0 ? ua.peso_medio_kg : null,
      ua_real: ua.ua_total,
      metodo_calculo_ua: ua.metodo,
    });

    const supabase = await createSupabaseServerClient();
    const { error: statusError } = await supabase
      .from('piquetes')
      .update({ status: 'Em pastejo' })
      .eq('id', parsed.piquete_id);

    if (statusError) throw statusError;

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao registrar entrada de lote.';
    return { success: false, error: msg };
  }
}

export async function fecharOcupacaoAction(
  ocupacaoId: string,
  formData: unknown,
): Promise<ActionResult> {
  try {
    const parsed = fecharOcupacaoSchema.parse(formData);

    const ocupacao = await getOcupacaoById(ocupacaoId);

    if (ocupacao.data_saida_real !== null) {
      return { success: false, error: 'Ocupação já foi fechada.' };
    }
    if (parsed.data_saida_real < ocupacao.data_entrada) {
      return {
        success: false,
        error: 'Data de saída não pode ser anterior à data de entrada.',
      };
    }

    await updateOcupacao(ocupacaoId, {
      data_saida_real: parsed.data_saida_real,
      altura_dossel_saida_cm: parsed.altura_dossel_saida_cm ?? null,
      observacoes: parsed.observacoes ?? ocupacao.observacoes,
    });

    const supabase = await createSupabaseServerClient();
    const { error: statusError } = await supabase
      .from('piquetes')
      .update({ status: 'Descanso' })
      .eq('id', ocupacao.piquete_id);

    if (statusError) throw statusError;

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao fechar ocupação.';
    return { success: false, error: msg };
  }
}

// ─── Eventos de manejo ────────────────────────────────────────────────────────

export async function registrarEventoManejoAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = eventoManejoFormSchema.parse(formData);

    if (parsed.tipo === 'reforma' || parsed.tipo === 'interdicao') {
      const temOcupacaoAberta = await hasOcupacaoAbertaNoPiquete(parsed.piquete_id);
      if (temOcupacaoAberta) {
        const acao = parsed.tipo === 'reforma' ? 'iniciar reforma' : 'interditar o piquete';
        return {
          success: false,
          error: `Feche a ocupação antes de ${acao}.`,
        };
      }
    }

    const evento = await createEventoManejo({
      piquete_id: parsed.piquete_id,
      tipo: parsed.tipo,
      data: parsed.data,
      insumo_id: parsed.insumo_id ?? null,
      quantidade_insumo: parsed.quantidade_insumo ?? null,
      unidade_insumo: parsed.unidade_insumo ?? null,
      dose_por_ha: parsed.dose_por_ha ?? null,
      maquina_id: parsed.maquina_id ?? null,
      custo_estimado: parsed.custo_estimado ?? null,
      observacoes: parsed.observacoes ?? null,
    });

    if (parsed.tipo === 'reforma' || parsed.tipo === 'interdicao') {
      const novoStatus = parsed.tipo === 'reforma' ? 'Em reforma' : 'Interditado';
      const supabase = await createSupabaseServerClient();
      const { error: statusError } = await supabase
        .from('piquetes')
        .update({ status: novoStatus })
        .eq('id', parsed.piquete_id);

      if (statusError) throw statusError;
    }

    if (parsed.colaborador_id) {
      await upsertRegistroColaborador('evento_manejo_pastagem', evento.id, parsed.colaborador_id);
    }

    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao registrar evento de manejo.';
    return { success: false, error: msg };
  }
}

export async function deletarEventoManejoAction(id: string): Promise<ActionResult> {
  try {
    await deleteRegistroColaborador('evento_manejo_pastagem', id);
    await deleteEventoManejo(id);
    revalidate();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir evento de manejo.';
    return { success: false, error: msg };
  }
}
