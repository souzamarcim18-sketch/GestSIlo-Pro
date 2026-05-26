import { supabase } from '@/lib/supabase';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';
import { calcularCustoColaborador } from '@/lib/utils';

export interface MaoObraAtividadeRow {
  id: string;
  data_inicio: string;
  data_fim: string | null;
  tipo_atividade: string;
  descricao: string | null;
  duracao_tipo: string;
  duracao_valor: number;
  custo_calculado: number;
  custo_manual: number | null;
  custo_final: number;
  colaboradores: string;
  vinculo_tipo: string | null;
  vinculo_nome: string | null;
}

export interface MaoObraResumoColaboradorRow {
  colaborador_nome: string;
  funcao: string;
  vinculo: string;
  qtd_atividades: number;
  custo_total: number;
}

export interface MaoObraResumoTipoRow {
  tipo_atividade: string;
  qtd_atividades: number;
  custo_total: number;
  duracao_total_horas: number;
}

export interface RelatorioMaoObraResult {
  atividades: MaoObraAtividadeRow[];
  resumoColaboradores: MaoObraResumoColaboradorRow[];
  resumoTipos: MaoObraResumoTipoRow[];
  kpis: {
    custo_total: number;
    qtd_atividades: number;
    colaborador_destaque: string | null;
  };
}

type RawAtividade = {
  id: string;
  data_inicio: string;
  data_fim: string | null;
  tipo_atividade: string;
  descricao: string | null;
  duracao_tipo: string;
  duracao_valor: number;
  custo_calculado: number;
  custo_manual: number | null;
  custo_final: number;
  talhao_id: string | null;
  silo_id: string | null;
  maquina_id: string | null;
  talhoes: { nome: string } | null;
  silos: { nome: string } | null;
  maquinas: { nome: string } | null;
  atividades_mao_obra_colaboradores: Array<{
    colaboradores: {
      nome: string;
      funcao: string;
      vinculo: string;
      tipo_valor: string;
      valor_referencia: number;
    } | null;
  }>;
};

export async function getRelatorioMaoObra(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioMaoObraResult> {
  const { gte, lte } = toUtcRangeFromLocal(from, to);

  const { data, error } = await supabase
    .from('atividades_mao_obra')
    .select(
      'id, data_inicio, data_fim, tipo_atividade, descricao, duracao_tipo, duracao_valor, ' +
      'custo_calculado, custo_manual, custo_final, talhao_id, silo_id, maquina_id, ' +
      'talhoes(nome), silos(nome), maquinas(nome), ' +
      'atividades_mao_obra_colaboradores(colaboradores(nome, funcao, vinculo, tipo_valor, valor_referencia))'
    )
    .eq('fazenda_id', fazendaId)
    .gte('data_inicio', gte)
    .lte('data_inicio', lte)
    .order('data_inicio', { ascending: false })
    .limit(10000);

  if (error) throw error;

  const raw = (data ?? []) as unknown as RawAtividade[];

  // ── Atividades achatadas ────────────────────────────────────────────────────
  const atividades: MaoObraAtividadeRow[] = raw.map((a) => {
    const colabs = a.atividades_mao_obra_colaboradores
      .map((ac) => ac.colaboradores?.nome ?? '')
      .filter(Boolean);

    let vinculo_tipo: string | null = null;
    let vinculo_nome: string | null = null;
    if (a.talhao_id && a.talhoes) { vinculo_tipo = 'Talhão'; vinculo_nome = a.talhoes.nome; }
    else if (a.silo_id && a.silos) { vinculo_tipo = 'Silo'; vinculo_nome = a.silos.nome; }
    else if (a.maquina_id && a.maquinas) { vinculo_tipo = 'Máquina'; vinculo_nome = a.maquinas.nome; }

    return {
      id: a.id,
      data_inicio: a.data_inicio,
      data_fim: a.data_fim,
      tipo_atividade: a.tipo_atividade,
      descricao: a.descricao,
      duracao_tipo: a.duracao_tipo,
      duracao_valor: a.duracao_valor,
      custo_calculado: a.custo_calculado,
      custo_manual: a.custo_manual,
      custo_final: a.custo_final,
      colaboradores: colabs.join(', ') || '—',
      vinculo_tipo,
      vinculo_nome,
    };
  });

  // ── Resumo por colaborador ─────────────────────────────────────────────────
  const colaboradorMap = new Map<string, MaoObraResumoColaboradorRow & { ativIds: Set<string> }>();
  for (const a of raw) {
    for (const ac of a.atividades_mao_obra_colaboradores) {
      const c = ac.colaboradores;
      if (!c) continue;
      const chave = c.nome;
      if (!colaboradorMap.has(chave)) {
        colaboradorMap.set(chave, {
          colaborador_nome: c.nome,
          funcao: c.funcao,
          vinculo: c.vinculo,
          qtd_atividades: 0,
          custo_total: 0,
          ativIds: new Set(),
        });
      }
      const entry = colaboradorMap.get(chave)!;
      if (!entry.ativIds.has(a.id)) {
        entry.ativIds.add(a.id);
        entry.qtd_atividades++;
        // custo individual do colaborador nesta atividade
        entry.custo_total += calcularCustoColaborador(
          a.duracao_tipo as 'horas' | 'dias',
          a.duracao_valor,
          c.tipo_valor as 'hora' | 'diaria',
          c.valor_referencia
        );
      }
    }
  }
  const resumoColaboradores: MaoObraResumoColaboradorRow[] = [...colaboradorMap.values()]
    .map(({ ativIds: _a, ...rest }) => rest)
    .sort((a, b) => b.custo_total - a.custo_total);

  // ── Resumo por tipo ────────────────────────────────────────────────────────
  const tipoMap = new Map<string, MaoObraResumoTipoRow>();
  for (const a of raw) {
    if (!tipoMap.has(a.tipo_atividade)) {
      tipoMap.set(a.tipo_atividade, {
        tipo_atividade: a.tipo_atividade,
        qtd_atividades: 0,
        custo_total: 0,
        duracao_total_horas: 0,
      });
    }
    const entry = tipoMap.get(a.tipo_atividade)!;
    entry.qtd_atividades++;
    entry.custo_total += a.custo_final;
    const horas = a.duracao_tipo === 'horas' ? a.duracao_valor : a.duracao_valor * 8;
    entry.duracao_total_horas += horas;
  }
  const resumoTipos: MaoObraResumoTipoRow[] = [...tipoMap.values()]
    .sort((a, b) => b.custo_total - a.custo_total);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const custo_total = atividades.reduce((s, a) => s + a.custo_final, 0);
  const colaborador_destaque = resumoColaboradores[0]?.colaborador_nome ?? null;

  return {
    atividades,
    resumoColaboradores,
    resumoTipos,
    kpis: {
      custo_total,
      qtd_atividades: atividades.length,
      colaborador_destaque,
    },
  };
}
