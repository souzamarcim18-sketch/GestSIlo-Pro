'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  listColaboradores,
  hasAtividades,
  hasAtividadesFuturas,
  getAtividadeById,
  listColaboradoresDaAtividade,
} from '@/lib/supabase/mao-de-obra';
import {
  colaboradorFormSchema,
  atividadeFormSchema,
} from '@/lib/validations/mao-de-obra';
import { calcularCustoColaborador } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { success: false; error: string };

// ─── Colaboradores ────────────────────────────────────────────────────────────

export async function criarColaboradorAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = colaboradorFormSchema.parse(formData);
    const supabase = await createSupabaseServerClient();
    const fazenda_id = await getFazendaId(supabase);

    const { error } = await supabase.from('colaboradores').insert({
      nome: parsed.nome,
      funcao: parsed.funcao,
      vinculo: parsed.vinculo,
      tipo_valor: parsed.tipo_valor,
      valor_ref: parsed.valor_ref,
      observacoes: parsed.observacoes ?? null,
      fazenda_id,
    });

    if (error) throw error;

    revalidatePath('/dashboard/mao-de-obra');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar colaborador';
    return { success: false, error: msg };
  }
}

export async function atualizarColaboradorAction(
  id: string,
  formData: unknown,
): Promise<ActionResult> {
  try {
    const parsed = colaboradorFormSchema.parse(formData);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('colaboradores')
      .update({
        nome: parsed.nome,
        funcao: parsed.funcao,
        vinculo: parsed.vinculo,
        tipo_valor: parsed.tipo_valor,
        valor_ref: parsed.valor_ref,
        observacoes: parsed.observacoes ?? null,
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/mao-de-obra');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar colaborador';
    return { success: false, error: msg };
  }
}

export async function deletarColaboradorAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    const temFuturas = await hasAtividadesFuturas(supabase, id);
    if (temFuturas) {
      return {
        success: false,
        error: 'Colaborador tem atividades agendadas. Cancele-as antes de desativar.',
      };
    }

    const temHistorico = await hasAtividades(supabase, id);

    if (temHistorico) {
      const { error } = await supabase
        .from('colaboradores')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }

    revalidatePath('/dashboard/mao-de-obra');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover colaborador';
    return { success: false, error: msg };
  }
}

// ─── Atividades ───────────────────────────────────────────────────────────────

async function getFazendaId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();

  if (error || !profile?.fazenda_id) throw new Error('Fazenda não encontrada');
  return profile.fazenda_id;
}

export async function criarAtividadeAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = atividadeFormSchema.parse(formData);
    const supabase = await createSupabaseServerClient();

    // Buscar dados dos colaboradores para calcular custos
    const colaboradoresData = await listColaboradores(supabase, {});
    const colaboradoresMap = new Map(colaboradoresData.map((c) => [c.id, c]));

    const custosColaboradores = parsed.colaboradores.map((colaboradorId) => {
      const colab = colaboradoresMap.get(colaboradorId);
      if (!colab) throw new Error(`Colaborador ${colaboradorId} não encontrado`);

      const custo = calcularCustoColaborador(
        parsed.duracao_tipo,
        parsed.duracao_valor,
        colab.tipo_valor,
        colab.valor_ref,
      );
      return { colaboradorId, nome: colab.nome, custo };
    });

    const custo_calculado = custosColaboradores.reduce((acc, c) => acc + c.custo, 0);
    const fazenda_id = await getFazendaId(supabase);

    // 1. INSERT em atividades_mao_obra — custo_final NÃO incluído (GENERATED ALWAYS AS)
    const { data: atividade, error: atividadeError } = await supabase
      .from('atividades_mao_obra')
      .insert({
        data: parsed.data,
        tipo_atividade: parsed.tipo_atividade,
        duracao_tipo: parsed.duracao_tipo,
        duracao_valor: parsed.duracao_valor,
        custo_calculado,
        custo_manual: parsed.custo_manual ?? null,
        talhao_id: parsed.talhao_id ?? null,
        silo_id: parsed.silo_id ?? null,
        maquina_id: parsed.maquina_id ?? null,
        observacoes: parsed.observacoes ?? null,
        fazenda_id,
        // custo_final NÃO incluído — GENERATED ALWAYS AS
      })
      .select('id, custo_calculado, custo_manual')
      .single();

    if (atividadeError || !atividade) {
      throw atividadeError ?? new Error('Falha ao criar atividade');
    }

    // 2. INSERT em atividades_mao_obra_colaboradores
    const { error: vinculosError } = await supabase
      .from('atividades_mao_obra_colaboradores')
      .insert(
        custosColaboradores.map(({ colaboradorId, custo }) => ({
          atividade_id: atividade.id,
          colaborador_id: colaboradorId,
          custo_colaborador: custo,
          fazenda_id,
        })),
      );

    if (vinculosError) {
      // Rollback: desfazer insert da atividade
      await supabase.from('atividades_mao_obra').delete().eq('id', atividade.id);
      throw new Error(`Falha ao vincular colaboradores: ${vinculosError.message}`);
    }

    // 3. INSERT em financeiro — usar custo_final calculado na action (sem round-trip)
    const custo_final_efetivo = parsed.custo_manual ?? custo_calculado;
    const nomes = custosColaboradores.map((c) => c.nome).join(', ');

    let despesa_id: string | null = null;
    try {
      const { data: despesa, error: despesaError } = await supabase
        .from('financeiro')
        .insert({
          tipo: 'Despesa',
          categoria: 'Mão de Obra',
          descricao: `${parsed.tipo_atividade} — ${nomes}`,
          valor: custo_final_efetivo,
          data: parsed.data,
          forma_pagamento: null,
          referencia_id: atividade.id,
          referencia_tipo: 'Mão de Obra',
          natureza: 'variavel',
          fazenda_id,
        })
        .select('id')
        .single();

      if (despesaError || !despesa) {
        throw despesaError ?? new Error('Falha ao criar despesa');
      }

      despesa_id = despesa.id;
    } catch (despesaErr) {
      // Rollback atômico: desfazer colaboradores e atividade
      await supabase
        .from('atividades_mao_obra_colaboradores')
        .delete()
        .eq('atividade_id', atividade.id);
      await supabase.from('atividades_mao_obra').delete().eq('id', atividade.id);

      const msg = despesaErr instanceof Error ? despesaErr.message : 'Erro desconhecido';
      return {
        success: false,
        error: `Falha ao registrar despesa financeira. Operação revertida. ${msg}`,
      };
    }

    // 4. Atualizar despesa_id na atividade
    // Se falhar: dado já persistido; rastreabilidade recuperável via referencia_id no financeiro
    const { error: updateError } = await supabase
      .from('atividades_mao_obra')
      .update({ despesa_id })
      .eq('id', atividade.id);

    if (updateError) {
      console.error('[criarAtividadeAction] Falha ao atualizar despesa_id:', updateError.message);
    }

    revalidatePath('/dashboard/mao-de-obra');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar atividade';
    return { success: false, error: msg };
  }
}

export async function editarAtividadeAction(
  id: string,
  formData: unknown,
): Promise<ActionResult> {
  try {
    const parsed = atividadeFormSchema.parse(formData);
    const supabase = await createSupabaseServerClient();

    const atividadeAtual = await getAtividadeById(supabase, id);
    if (!atividadeAtual) {
      return { success: false, error: 'Atividade não encontrada' };
    }

    // Recalcular custos
    const colaboradoresData = await listColaboradores(supabase, {});
    const colaboradoresMap = new Map(colaboradoresData.map((c) => [c.id, c]));

    const custosColaboradores = parsed.colaboradores.map((colaboradorId) => {
      const colab = colaboradoresMap.get(colaboradorId);
      if (!colab) throw new Error(`Colaborador ${colaboradorId} não encontrado`);

      const custo = calcularCustoColaborador(
        parsed.duracao_tipo,
        parsed.duracao_valor,
        colab.tipo_valor,
        colab.valor_ref,
      );
      return { colaboradorId, nome: colab.nome, custo };
    });

    const custo_calculado = custosColaboradores.reduce((acc, c) => acc + c.custo, 0);
    const custo_final_novo = parsed.custo_manual ?? custo_calculado;

    // 1. UPDATE atividades_mao_obra — custo_final NÃO incluído (GENERATED ALWAYS AS)
    const { error: atividadeError } = await supabase
      .from('atividades_mao_obra')
      .update({
        data: parsed.data,
        tipo_atividade: parsed.tipo_atividade,
        duracao_tipo: parsed.duracao_tipo,
        duracao_valor: parsed.duracao_valor,
        custo_calculado,
        custo_manual: parsed.custo_manual ?? null,
        talhao_id: parsed.talhao_id ?? null,
        silo_id: parsed.silo_id ?? null,
        maquina_id: parsed.maquina_id ?? null,
        observacoes: parsed.observacoes ?? null,
        // custo_final NÃO incluído — GENERATED ALWAYS AS
      })
      .eq('id', id);

    if (atividadeError) throw atividadeError;

    // 2. Substituir colaboradores: DELETE + INSERT
    const { error: deleteError } = await supabase
      .from('atividades_mao_obra_colaboradores')
      .delete()
      .eq('atividade_id', id);

    if (deleteError) throw deleteError;

    const fazenda_id = await getFazendaId(supabase);

    const { error: vinculosError } = await supabase
      .from('atividades_mao_obra_colaboradores')
      .insert(
        custosColaboradores.map(({ colaboradorId, custo }) => ({
          atividade_id: id,
          colaborador_id: colaboradorId,
          custo_colaborador: custo,
          fazenda_id,
        })),
      );

    if (vinculosError) throw vinculosError;

    // 3. Sincronizar financeiro se despesa_id existir
    if (atividadeAtual.despesa_id) {
      const nomes = custosColaboradores.map((c) => c.nome).join(', ');

      const { error: financeiroError } = await supabase
        .from('financeiro')
        .update({
          valor: custo_final_novo,
          descricao: `${parsed.tipo_atividade} — ${nomes}`,
          data: parsed.data,
        })
        .eq('id', atividadeAtual.despesa_id);

      if (financeiroError) {
        console.error('[editarAtividadeAction] Falha ao sincronizar financeiro:', financeiroError.message);
      }
    }

    revalidatePath('/dashboard/mao-de-obra');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao editar atividade';
    return { success: false, error: msg };
  }
}

export async function deletarAtividadeAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    const atividade = await getAtividadeById(supabase, id);

    // Remover despesa financeira linkada
    if (atividade?.despesa_id) {
      const { error: financeiroError } = await supabase
        .from('financeiro')
        .delete()
        .eq('id', atividade.despesa_id);

      if (financeiroError) {
        console.error('[deletarAtividadeAction] Falha ao remover despesa:', financeiroError.message);
      }
    }

    // Remover colaboradores vinculados (CASCADE resolve no banco, mas segue padrão do projeto)
    await supabase
      .from('atividades_mao_obra_colaboradores')
      .delete()
      .eq('atividade_id', id);

    const { error } = await supabase
      .from('atividades_mao_obra')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/mao-de-obra');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao deletar atividade';
    return { success: false, error: msg };
  }
}

// ─── Folha mensal de salários (CLT) ───────────────────────────────────────────

const REF_TIPO_SALARIO = 'Salário CLT';

/** Normaliza 'YYYY-MM' para o primeiro dia do mês ('YYYY-MM-01'). */
function primeiroDiaDoMes(mesAno: string): string | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mesAno)) return null;
  return `${mesAno}-01`;
}

function fimDoMesExclusivo(mesAno: string): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  const proximo = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`;
  return `${proximo}-01`;
}

export interface LinhaFolhaCLT {
  colaborador_id: string;
  nome: string;
  salario: number;
  ja_lancado: boolean;
  despesa_id: string | null;
}

/**
 * Retorna o status da folha de um mês: para cada CLT ativo, se o salário já foi
 * lançado no financeiro naquele mês.
 */
export async function getStatusFolhaMensalAction(
  mesAno: string,
): Promise<{ linhas: LinhaFolhaCLT[]; total: number } | { error: string }> {
  const inicio = primeiroDiaDoMes(mesAno);
  if (!inicio) return { error: 'Mês inválido.' };
  const fim = fimDoMesExclusivo(mesAno);

  const supabase = await createSupabaseServerClient();

  const colaboradores = await listColaboradores(supabase, { ativo: true });
  const clt = colaboradores.filter((c) => c.vinculo === 'CLT' && c.tipo_valor === 'mensal');

  const { data: despesas, error } = await supabase
    .from('financeiro')
    .select('id, referencia_id, valor')
    .eq('referencia_tipo', REF_TIPO_SALARIO)
    .gte('data', inicio)
    .lt('data', fim);

  if (error) return { error: error.message };

  const lancadosPorColab = new Map(
    (despesas ?? []).map((d) => [d.referencia_id, { id: d.id }]),
  );

  const linhas: LinhaFolhaCLT[] = clt.map((c) => {
    const lancado = lancadosPorColab.get(c.id);
    return {
      colaborador_id: c.id,
      nome: c.nome,
      salario: c.valor_ref,
      ja_lancado: !!lancado,
      despesa_id: lancado?.id ?? null,
    };
  });

  const total = linhas.reduce((acc, l) => acc + l.salario, 0);
  return { linhas, total };
}

/**
 * Gera a folha de salários do mês: cria no financeiro 1 despesa por CLT ativo
 * que ainda não tenha lançamento naquele mês. Idempotente.
 */
export async function gerarFolhaMensalAction(
  mesAno: string,
): Promise<{ success: true; criados: number } | { success: false; error: string }> {
  try {
    const inicio = primeiroDiaDoMes(mesAno);
    if (!inicio) return { success: false, error: 'Mês inválido.' };

    const status = await getStatusFolhaMensalAction(mesAno);
    if ('error' in status) return { success: false, error: status.error };

    const pendentes = status.linhas.filter((l) => !l.ja_lancado && l.salario > 0);
    if (pendentes.length === 0) {
      return { success: true, criados: 0 };
    }

    const supabase = await createSupabaseServerClient();
    const fazenda_id = await getFazendaId(supabase);

    const [ano, mes] = mesAno.split('-');
    const rotuloMes = `${mes}/${ano}`;

    const { error } = await supabase.from('financeiro').insert(
      pendentes.map((l) => ({
        tipo: 'Despesa',
        categoria: 'Mão de Obra',
        descricao: `Salário CLT — ${l.nome} (${rotuloMes})`,
        valor: l.salario,
        data: inicio,
        forma_pagamento: null,
        referencia_id: l.colaborador_id,
        referencia_tipo: REF_TIPO_SALARIO,
        natureza: 'fixo',
        fazenda_id,
      })),
    );

    if (error) throw error;

    revalidatePath('/dashboard/mao-de-obra');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard');
    return { success: true, criados: pendentes.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar folha mensal';
    return { success: false, error: msg };
  }
}

/** Remove o lançamento de salário de um CLT em um mês (desfaz a folha individual). */
export async function removerSalarioFolhaAction(despesaId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('financeiro')
      .delete()
      .eq('id', despesaId)
      .eq('referencia_tipo', REF_TIPO_SALARIO);

    if (error) throw error;

    revalidatePath('/dashboard/mao-de-obra');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover salário';
    return { success: false, error: msg };
  }
}

// ─── Auxiliares para formulários ──────────────────────────────────────────────

export async function listarColaboradoresAtivosAction() {
  const supabase = await createSupabaseServerClient();
  return listColaboradores(supabase, { ativo: true });
}

export async function listarColaboradoresDaAtividadeAction(atividadeId: string) {
  const supabase = await createSupabaseServerClient();
  return listColaboradoresDaAtividade(supabase, atividadeId);
}
