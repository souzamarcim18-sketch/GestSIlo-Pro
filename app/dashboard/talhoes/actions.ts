'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';
import { AtividadeCampoSchema } from '@/lib/validators/atividades-campo';
import { TipoOperacao } from '@/lib/types/talhoes';

type ActionResult =
  | { success: true; atividadeId: string }
  | { success: false; error: string };

/**
 * Vincula colaborador a uma atividade de campo (fire-and-forget do client).
 */
export async function vincularColaboradorAtividadeAction(
  atividadeId: string,
  colaboradorId: string | null,
): Promise<void> {
  if (!colaboradorId) return;
  await upsertRegistroColaborador('atividade_campo', atividadeId, colaboradorId);
}

/**
 * Cria uma atividade de campo e, quando há serviço terceirizado ou análise de solo,
 * registra a despesa correspondente no financeiro (categoria "Lavouras").
 *
 * Regra de custo (padrão gestão rural):
 *  - Insumo usado na operação → NÃO gera despesa (custo já entrou no estoque na compra)
 *  - Máquina própria → NÃO gera despesa (custo operacional, não é saída de caixa)
 *  - Serviço terceirizado (valor_terceirizacao_r) → GERA despesa
 *  - Análise de solo (custo_amostra_r) → GERA despesa
 *  - Irrigação (horas × custo_por_hora_r) → GERA despesa
 */
export async function criarAtividadeCampoAction(
  formData: unknown,
  ctx: { cicloId: string; talhaoId: string; talhaoAreaHa: number; talhaoNome: string },
): Promise<ActionResult> {
  try {
    const parsed = AtividadeCampoSchema.parse(formData);
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sessão inválida.' };

    const fazenda_id = user.user_metadata?.fazenda_id as string | undefined;

    // Calcular custo_total da atividade
    let custo_total = parsed.custo_manual ?? 0;
    if (!parsed.custo_manual) {
      if (parsed.tipo_operacao === TipoOperacao.IRRIGACAO && parsed.horas_irrigacao && parsed.custo_por_hora_r) {
        custo_total = parsed.horas_irrigacao * parsed.custo_por_hora_r;
      } else if (parsed.tipo_operacao === TipoOperacao.COLHEITA && parsed.valor_terceirizacao_r) {
        custo_total = parsed.valor_terceirizacao_r;
      } else if (parsed.tipo_operacao === TipoOperacao.ANALISE_SOLO && parsed.custo_amostra_r) {
        custo_total = parsed.custo_amostra_r;
      }
    }

    // Custo de insumo (compõe custo de produção, mas não gera despesa financeira)
    if (
      parsed.insumo_id &&
      parsed.dose_ton_ha &&
      ctx.talhaoAreaHa > 0 &&
      [TipoOperacao.CALAGEM, TipoOperacao.GESSAGEM, TipoOperacao.PULVERIZACAO].includes(
        parsed.tipo_operacao as TipoOperacao
      )
    ) {
      const { data: insumo } = await supabase
        .from('insumos')
        .select('custo_medio')
        .eq('id', parsed.insumo_id)
        .single();
      if (insumo?.custo_medio) {
        custo_total += parsed.dose_ton_ha * ctx.talhaoAreaHa * insumo.custo_medio;
      }
    }

    // Custo de máquina própria (compõe custo de produção, mas não gera despesa financeira)
    if (parsed.maquina_id && parsed.horas_maquina) {
      const { data: maquina } = await supabase
        .from('maquinas')
        .select('custo_hora')
        .eq('id', parsed.maquina_id)
        .single();
      if (maquina?.custo_hora) {
        custo_total += parsed.horas_maquina * maquina.custo_hora;
      }
    }

    // INSERT da atividade
    const { data: atividade, error: atividadeError } = await supabase
      .from('atividades_campo')
      .insert({
        ciclo_id: ctx.cicloId,
        talhao_id: ctx.talhaoId,
        fazenda_id,
        tipo_operacao: parsed.tipo_operacao,
        data: parsed.data,
        maquina_id: parsed.maquina_id ?? null,
        horas_maquina: parsed.horas_maquina ?? null,
        observacoes: parsed.observacoes ?? null,
        custo_manual: parsed.custo_manual ?? null,
        custo_total,
        tipo_operacao_solo: parsed.tipo_operacao_solo ?? null,
        insumo_id: parsed.insumo_id ?? null,
        dose_ton_ha: parsed.dose_ton_ha ?? null,
        semente_id: parsed.semente_id ?? null,
        populacao_plantas_ha: parsed.populacao_plantas_ha ?? null,
        sacos_ha: parsed.sacos_ha ?? null,
        espacamento_entre_linhas_cm: parsed.espacamento_entre_linhas_cm ?? null,
        categoria_pulverizacao: parsed.categoria_pulverizacao ?? null,
        dose_valor: parsed.dose_valor ?? null,
        dose_unidade: parsed.dose_unidade ?? null,
        volume_calda_l_ha: parsed.volume_calda_l_ha ?? null,
        produtividade_ton_ha: parsed.produtividade_ton_ha ?? null,
        maquina_colheita_id: parsed.maquina_colheita_id ?? null,
        horas_colheita: parsed.horas_colheita ?? null,
        maquina_transporte_id: parsed.maquina_transporte_id ?? null,
        horas_transporte: parsed.horas_transporte ?? null,
        maquina_compactacao_id: parsed.maquina_compactacao_id ?? null,
        horas_compactacao: parsed.horas_compactacao ?? null,
        valor_terceirizacao_r: parsed.valor_terceirizacao_r ?? null,
        custo_amostra_r: parsed.custo_amostra_r ?? null,
        metodo_entrada: parsed.metodo_entrada ?? null,
        ph_cacl2: parsed.ph_cacl2 ?? null,
        mo_g_dm3: parsed.mo_g_dm3 ?? null,
        p_mg_dm3: parsed.p_mg_dm3 ?? null,
        k_mmolc_dm3: parsed.k_mmolc_dm3 ?? null,
        ca_mmolc_dm3: parsed.ca_mmolc_dm3 ?? null,
        mg_mmolc_dm3: parsed.mg_mmolc_dm3 ?? null,
        al_mmolc_dm3: parsed.al_mmolc_dm3 ?? null,
        h_al_mmolc_dm3: parsed.h_al_mmolc_dm3 ?? null,
        s_mg_dm3: parsed.s_mg_dm3 ?? null,
        b_mg_dm3: parsed.b_mg_dm3 ?? null,
        cu_mg_dm3: parsed.cu_mg_dm3 ?? null,
        fe_mg_dm3: parsed.fe_mg_dm3 ?? null,
        mn_mg_dm3: parsed.mn_mg_dm3 ?? null,
        zn_mg_dm3: parsed.zn_mg_dm3 ?? null,
        lamina_mm: parsed.lamina_mm ?? null,
        horas_irrigacao: parsed.horas_irrigacao ?? null,
        custo_por_hora_r: parsed.custo_por_hora_r ?? null,
      })
      .select('id')
      .single();

    if (atividadeError || !atividade) {
      return { success: false, error: atividadeError?.message ?? 'Erro ao criar atividade.' };
    }

    // Saída de insumo do estoque (sem despesa financeira — custo já entrou na compra)
    if (
      parsed.insumo_id &&
      parsed.dose_ton_ha &&
      ctx.talhaoAreaHa > 0 &&
      [TipoOperacao.CALAGEM, TipoOperacao.GESSAGEM, TipoOperacao.PULVERIZACAO].includes(
        parsed.tipo_operacao as TipoOperacao
      )
    ) {
      const { data: insumo } = await supabase
        .from('insumos')
        .select('custo_medio, estoque_atual, nome, unidade')
        .eq('id', parsed.insumo_id)
        .single();

      if (insumo) {
        const quantidade = parsed.dose_ton_ha * ctx.talhaoAreaHa;
        if (insumo.estoque_atual < quantidade) {
          await supabase.from('atividades_campo').delete().eq('id', atividade.id);
          return {
            success: false,
            error: `Estoque insuficiente de ${insumo.nome}. Disponível: ${insumo.estoque_atual} ${insumo.unidade}, Solicitado: ${quantidade.toFixed(2)}`,
          };
        }

        const { error: insumoError } = await supabase.from('movimentacoes_insumo').insert({
          insumo_id: parsed.insumo_id,
          tipo: 'Saída',
          quantidade,
          valor_unitario: insumo.custo_medio,
          tipo_saida: 'USO_INTERNO',
          destino_tipo: 'talhao',
          destino_id: ctx.talhaoId,
          origem: 'talhao',
          data: parsed.data,
          observacoes: `Aplicado em atividade: ${parsed.tipo_operacao} — ${ctx.talhaoNome}`,
          fazenda_id,
        });

        if (insumoError) {
          await supabase.from('atividades_campo').delete().eq('id', atividade.id);
          return { success: false, error: 'Falha ao registrar saída de insumo. Operação revertida.' };
        }
      }
    }

    // Despesa financeira — apenas para serviços com saída real de caixa
    const valorDespesa = calcularValorDespesa(parsed);
    if (valorDespesa > 0) {
      const descricao = gerarDescricaoDespesa(parsed, ctx.talhaoNome);

      const { data: despesa, error: despesaError } = await supabase
        .from('financeiro')
        .insert({
          tipo: 'Despesa',
          categoria: 'Lavouras',
          descricao,
          valor: valorDespesa,
          data: parsed.data,
          forma_pagamento: null,
          referencia_id: atividade.id,
          referencia_tipo: 'Atividade Campo',
          natureza: 'variavel',
          fazenda_id,
        })
        .select('id')
        .single();

      if (despesaError || !despesa) {
        // Reverter insumo e atividade
        await supabase.from('movimentacoes_insumo').delete().eq('destino_id', ctx.talhaoId).eq('data', parsed.data);
        await supabase.from('atividades_campo').delete().eq('id', atividade.id);
        return { success: false, error: 'Falha ao registrar despesa financeira. Operação revertida.' };
      }

      await supabase
        .from('atividades_campo')
        .update({ despesa_id: despesa.id })
        .eq('id', atividade.id);
    }

    // Vincular colaborador (fire-and-forget)
    if (parsed.colaborador_id) {
      upsertRegistroColaborador('atividade_campo', atividade.id, parsed.colaborador_id).catch(
        (e) => console.error('[criarAtividadeCampoAction] Falha ao vincular colaborador:', e)
      );
    }

    revalidatePath('/dashboard/talhoes');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard');

    return { success: true, atividadeId: atividade.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao registrar atividade.';
    return { success: false, error: msg };
  }
}

/**
 * Calcula o valor da despesa real de caixa da atividade.
 * Insumos e máquinas próprias NÃO entram aqui.
 */
function calcularValorDespesa(parsed: ReturnType<typeof AtividadeCampoSchema.parse>): number {
  if (parsed.custo_manual && parsed.custo_manual > 0) return parsed.custo_manual;

  if (parsed.tipo_operacao === TipoOperacao.ANALISE_SOLO && parsed.custo_amostra_r) {
    return parsed.custo_amostra_r;
  }
  if (
    parsed.tipo_operacao === TipoOperacao.COLHEITA &&
    parsed.valor_terceirizacao_r &&
    parsed.valor_terceirizacao_r > 0
  ) {
    return parsed.valor_terceirizacao_r;
  }
  if (
    parsed.tipo_operacao === TipoOperacao.CALAGEM &&
    parsed.valor_terceirizacao_r &&
    parsed.valor_terceirizacao_r > 0
  ) {
    return parsed.valor_terceirizacao_r;
  }
  if (
    parsed.tipo_operacao === TipoOperacao.IRRIGACAO &&
    parsed.horas_irrigacao &&
    parsed.custo_por_hora_r
  ) {
    return parsed.horas_irrigacao * parsed.custo_por_hora_r;
  }
  return 0;
}

function gerarDescricaoDespesa(
  parsed: ReturnType<typeof AtividadeCampoSchema.parse>,
  talhaoNome: string,
): string {
  const base = `${parsed.tipo_operacao} — ${talhaoNome}`;
  if (parsed.tipo_operacao === TipoOperacao.ANALISE_SOLO) return `Análise de solo — ${talhaoNome}`;
  if (parsed.tipo_operacao === TipoOperacao.COLHEITA) return `Colheita terceirizada — ${talhaoNome}`;
  if (parsed.tipo_operacao === TipoOperacao.CALAGEM) return `Aplicação calcário terceirizada — ${talhaoNome}`;
  if (parsed.tipo_operacao === TipoOperacao.IRRIGACAO) return `Irrigação — ${talhaoNome}`;
  return base;
}
