import {
  supabase,
  type Silo,
  type MovimentacaoSilo,
  type AtividadeCampo,
  type Financeiro,
  type AvaliacaoBromatologica,
} from '../supabase';
import { q } from './queries-audit';
import { FAIXAS_PSPS, TMP_IDEAL_SEM_KP, TMP_IDEAL_COM_KP } from '../validations/silos';

export async function updateSilo(id: string, silo: Partial<Silo>) {
  const { data, error } = await supabase
    .from('silos')
    .update(silo)
    .eq('id', id)
    .select('id, nome, tipo, fazenda_id, talhao_id, materia_seca_percent, insumo_lona_id, insumo_inoculante_id, cultura_ensilada, data_fechamento, data_abertura_prevista, data_abertura_real, volume_ensilado_ton_mv, comprimento_m, largura_m, altura_m, observacoes_gerais, custo_aquisicao_rs_ton')
    .single();
  if (error) throw error;
  return data as Silo;
}

export async function deleteSilo(id: string) {
  const { error } = await supabase
    .from('silos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getCustoProducaoSilagem(siloId: string, talhaoIdDireto?: string) {
  // 1. Usar talhao_id direto do silo; se não fornecido, busca na primeira entrada
  let talhaoId: string | null = talhaoIdDireto ?? null;
  let dataEntrada: string | null = null;

  if (!talhaoId) {
    const { data: primeiraEntrada } = await supabase
      .from('movimentacoes_silo')
      .select('talhao_id, data')
      .eq('silo_id', siloId)
      .eq('tipo', 'Entrada')
      .order('data', { ascending: true })
      .limit(1)
      .single();

    talhaoId = primeiraEntrada?.talhao_id ?? null;
    dataEntrada = primeiraEntrada?.data ?? null;
  }

  if (!talhaoId) return null;

  // 2. Buscar o ciclo agrícola ativo ou mais recente desse talhão
  // Se não temos data da entrada, usar hoje como referência
  const dataRef = dataEntrada ?? new Date().toISOString().slice(0, 10);
  const { data: ciclo } = await supabase
    .from('ciclos_agricolas')
    .select('id')
    .eq('talhao_id', talhaoId)
    .lte('data_plantio', dataRef)
    .or(`data_colheita_real.is.null,data_colheita_real.gte.${dataRef}`)
    .order('data_plantio', { ascending: false })
    .limit(1)
    .single();

  // 3. Somar custos do financeiro vinculados ao talhão
  const { data: custosFinanceiro } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa');

  // 4. Somar custos das atividades de campo vinculadas ao ciclo
  let custoAtividades = 0;
  if (ciclo?.id) {
    const { data: atividades } = await supabase
      .from('atividades_campo')
      .select('custo_total')
      .eq('ciclo_id', ciclo.id);
    custoAtividades = (atividades as AtividadeCampo[])?.reduce((acc: number, a: AtividadeCampo) => acc + (a.custo_total || 0), 0) || 0;
  }

  const custoFinanceiroTotal = (custosFinanceiro as Financeiro[])?.reduce((acc: number, c: Financeiro) => acc + c.valor, 0) || 0;
  const custoTotal = custoFinanceiroTotal + custoAtividades;

  // 5. Somar total de toneladas ensiladas (Entradas)
  const { data: entradas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade')
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada');

  const totalToneladas = (entradas as MovimentacaoSilo[])?.reduce((acc: number, e: MovimentacaoSilo) => acc + e.quantidade, 0) || 0;

  if (totalToneladas === 0) return null;

  return {
    custoTotal,
    totalToneladas,
    custoPorTonelada: custoTotal / totalToneladas
  };
}

/**
 * Calcula a densidade do silo em kg/m³
 * Fórmula: volume (toneladas em MV) / volume físico (m³)
 * volume físico = comprimento × largura × altura (em metros)
 */
export function calcularDensidade(
  volumeTonMv: number,
  comprimento: number,
  largura: number,
  altura: number
): number {
  const volumeMetrosCubicos = comprimento * largura * altura;
  if (volumeMetrosCubicos === 0) return 0;
  // Converte toneladas para kg (1 ton = 1000 kg)
  return (volumeTonMv * 1000) / volumeMetrosCubicos;
}

/**
 * Calcula o estoque atual do silo
 * Retorna: { total: toneladas, percentage: % do volume ensilado }
 */
export async function calcularEstoqueAtual(
  siloId: string
): Promise<{ total: number; percentage: number }> {
  const { data: entradas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade')
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada');

  const { data: saidas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade')
    .eq('silo_id', siloId)
    .eq('tipo', 'Saída');

  const totalEntradas = (entradas as MovimentacaoSilo[])?.reduce(
    (acc, e) => acc + e.quantidade,
    0
  ) || 0;
  const totalSaidas = (saidas as MovimentacaoSilo[])?.reduce(
    (acc, s) => acc + s.quantidade,
    0
  ) || 0;

  const estoque = totalEntradas - totalSaidas;

  // Buscar volume ensilado para calcular percentual
  const silo = await q.silos.getById(siloId);
  const volumeEnsilado = silo.volume_ensilado_ton_mv || 0;

  const percentage = volumeEnsilado > 0 ? (estoque / volumeEnsilado) * 100 : 0;

  return {
    total: Math.max(0, estoque), // Nunca negativo
    percentage: Math.min(100, Math.max(0, percentage)), // Entre 0-100%
  };
}

/**
 * Calcula o consumo diário em ton/dia
 * Usa: Σ(saídas com subtipo='Uso na alimentação') / dias desde data_abertura_real
 */
export async function calcularConsumoDiario(
  siloId: string
): Promise<number> {
  const silo = await q.silos.getById(siloId);

  // Se não tem data de abertura real, não há consumo
  if (!silo.data_abertura_real) return 0;

  const { data: saidas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade, data')
    .eq('silo_id', siloId)
    .eq('tipo', 'Saída')
    .eq('subtipo', 'Uso na alimentação');

  const totalSaidasUso = (saidas as MovimentacaoSilo[])?.reduce(
    (acc, s) => acc + s.quantidade,
    0
  ) || 0;

  const dataAbertura = new Date(silo.data_abertura_real);
  const hoje = new Date();
  const diasDesdeAbertura = Math.max(
    1,
    Math.floor(
      (hoje.getTime() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return totalSaidasUso / diasDesdeAbertura;
}

/**
 * Obtém o status atual do silo
 * Regras:
 * - Enchendo: tem entradas mas sem data_fechamento
 * - Fechado: tem data_fechamento, sem data_abertura_real
 * - Aberto: tem data_abertura_real, estoque > 0
 * - Vazio: estoque = 0
 * - Atenção: estoque para < 7 dias
 */
export async function obterStatusSilo(
  siloId: string
): Promise<'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção'> {
  const silo = await q.silos.getById(siloId);
  const { total: estoque } = await calcularEstoqueAtual(siloId);

  // Vazio
  if (estoque === 0) return 'Vazio';

  // Enchendo: tem entradas mas sem data_fechamento
  const { count: countEntradas } = await supabase
    .from('movimentacoes_silo')
    .select('id', { count: 'exact', head: true })
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada');

  if (countEntradas && countEntradas > 0 && !silo.data_fechamento) {
    return 'Enchendo';
  }

  // Fechado: tem data_fechamento, sem data_abertura_real
  if (silo.data_fechamento && !silo.data_abertura_real) return 'Fechado';

  // Atenção: estoque para < 7 dias
  const consumoDiario = await calcularConsumoDiario(siloId);
  if (consumoDiario > 0 && estoque / consumoDiario < 7) return 'Atenção';

  // Aberto: tem data_abertura_real, estoque > 0
  if (silo.data_abertura_real && estoque > 0) return 'Aberto';

  return 'Aberto'; // Default
}

/**
 * Retorna 'ok' se o valor da peneira está dentro da faixa ideal (FAIXAS_PSPS), 'fora' caso contrário.
 */
export function calcularStatusPeneira(
  peneira: string,
  valor: number
): 'ok' | 'fora' {
  const faixa = FAIXAS_PSPS[peneira];
  if (!faixa) return 'fora';
  return valor >= faixa.min && valor <= faixa.max ? 'ok' : 'fora';
}

/**
 * Retorna 'ok' se o TMP está dentro da faixa ideal, considerando presença de Kernel Processor.
 */
export function calcularStatusTmp(
  tmpMm: number,
  kernelProcessor: boolean
): 'ok' | 'fora' {
  const faixa = kernelProcessor ? TMP_IDEAL_COM_KP : TMP_IDEAL_SEM_KP;
  return tmpMm >= faixa.min && tmpMm <= faixa.max ? 'ok' : 'fora';
}

/**
 * Obtém o último MS (matéria seca) registrado em avaliações bromatológicas
 */
export async function obterMsAtual(siloId: string): Promise<number | null> {
  const { data: avaliacoes } = await supabase
    .from('avaliacoes_bromatologicas')
    .select('ms')
    .eq('silo_id', siloId)
    .order('data', { ascending: false })
    .limit(1)
    .single();

  return (avaliacoes as AvaliacaoBromatologica | null)?.ms ?? null;
}

/**
 * Calcula quantos dias de estoque restam
 * Usa: estoque atual / consumo diário
 * Retorna null se não há consumo calculável
 */
export async function obterEstoqueParaDias(
  siloId: string
): Promise<number | null> {
  const { total: estoque } = await calcularEstoqueAtual(siloId);

  if (estoque === 0) return 0;

  const consumoDiario = await calcularConsumoDiario(siloId);

  // Se não há consumo registrado, não conseguimos calcular
  if (consumoDiario === 0) return null;

  return Math.floor(estoque / consumoDiario);
}

export interface FatiaCusto {
  label: string;
  valor: number;
}

// Grupos de tipo_operacao para agrupamento no gráfico
const GRUPO_PREPARO_SOLO = new Set([
  'Aração', 'Gradagem', 'Subsolagem', 'Escarificação',
  'Nivelamento', 'Roçagem', 'Destorroamento',
]);
const GRUPO_CORRETIVOS = new Set(['Calagem', 'Gessagem']);

/**
 * Retorna o breakdown de custos do silo para exibição no gráfico donut.
 * Retorna null se não houver nenhuma base de custo.
 */
export async function getCustoSiloDetalhado(
  silo: Silo
): Promise<{ fatias: FatiaCusto[]; custoPorTonelada: number; custoTotal: number } | null> {
  const volumeTon = silo.volume_ensilado_ton_mv || 0;
  const fatias: FatiaCusto[] = [];

  // ── 1. Base: talhão (produção) ou aquisição ──────────────────────────────
  if (silo.talhao_id) {
    // Buscar ciclo e custos detalhados do talhão
    let talhaoId = silo.talhao_id;

    // Ciclo agrícola mais recente do talhão
    const { data: ciclo } = await supabase
      .from('ciclos_agricolas')
      .select('id')
      .eq('talhao_id', talhaoId)
      .order('data_plantio', { ascending: false })
      .limit(1)
      .single();

    // Atividades de campo agrupadas por tipo_operacao
    if (ciclo?.id) {
      const { data: atividades } = await supabase
        .from('atividades_campo')
        .select('tipo_operacao, custo_total')
        .eq('ciclo_id', ciclo.id);

      if (atividades?.length) {
        const grupos: Record<string, number> = {};
        for (const atv of atividades as AtividadeCampo[]) {
          const custo = atv.custo_total || 0;
          if (custo === 0) continue;
          let grupo: string;
          if (GRUPO_PREPARO_SOLO.has(atv.tipo_operacao)) grupo = 'Preparo de Solo';
          else if (GRUPO_CORRETIVOS.has(atv.tipo_operacao)) grupo = 'Corretivos';
          else if (atv.tipo_operacao === 'Plantio') grupo = 'Plantio/Sementes';
          else if (atv.tipo_operacao === 'Pulverização') grupo = 'Pulverização';
          else if (atv.tipo_operacao === 'Colheita') grupo = 'Colheita';
          else grupo = 'Outras Operações';
          grupos[grupo] = (grupos[grupo] || 0) + custo;
        }
        for (const [label, valor] of Object.entries(grupos)) {
          fatias.push({ label, valor });
        }
      }
    }

    // Despesas financeiras vinculadas ao talhão
    const { data: custosFinanceiro } = await supabase
      .from('financeiro')
      .select('valor')
      .eq('referencia_id', talhaoId)
      .eq('referencia_tipo', 'Talhão')
      .eq('tipo', 'Despesa');

    const totalFinanceiro =
      (custosFinanceiro as Financeiro[])?.reduce((acc, c) => acc + c.valor, 0) || 0;
    if (totalFinanceiro > 0) fatias.push({ label: 'Despesas do Talhão', valor: totalFinanceiro });

    // Se não há nada do talhão, tenta custo de aquisição como fallback
    if (fatias.length === 0) {
      if (!silo.custo_aquisicao_rs_ton) return null;
      fatias.push({ label: 'Custo de Aquisição', valor: volumeTon * silo.custo_aquisicao_rs_ton });
    }
  } else if (silo.custo_aquisicao_rs_ton) {
    fatias.push({ label: 'Custo de Aquisição', valor: volumeTon * silo.custo_aquisicao_rs_ton });
  } else {
    return null;
  }

  // ── 2. Insumos aplicados ao silo (lona, inoculante, outros) ──────────────
  const { data: movsInsumo } = await supabase
    .from('movimentacoes_insumo')
    .select('quantidade, valor_unitario, insumo_id, insumos(nome, custo_medio)')
    .eq('destino_tipo', 'silo')
    .eq('destino_id', silo.id)
    .eq('tipo', 'Saída');

  if (movsInsumo?.length) {
    const porInsumo: Record<string, { nome: string; valor: number }> = {};
    for (const mov of movsInsumo) {
      const insumoRef = Array.isArray(mov.insumos) ? mov.insumos[0] : mov.insumos;
      const ref = insumoRef as { nome: string; custo_medio: number } | null;
      const unitario = mov.valor_unitario ?? ref?.custo_medio ?? 0;
      const valor = mov.quantidade * unitario;
      if (valor === 0) continue;
      const key = mov.insumo_id;
      if (!porInsumo[key]) porInsumo[key] = { nome: ref?.nome ?? 'Insumo', valor: 0 };
      porInsumo[key].valor += valor;
    }

    // Identificar lona e inoculante pelo id cadastrado no silo
    for (const [insumoId, { nome, valor }] of Object.entries(porInsumo)) {
      let label: string;
      if (insumoId === silo.insumo_lona_id) label = 'Lona';
      else if (insumoId === silo.insumo_inoculante_id) label = 'Inoculante';
      else label = nome;
      // Mesclar com fatia existente de mesmo label, se houver
      const existing = fatias.find((f) => f.label === label);
      if (existing) existing.valor += valor;
      else fatias.push({ label, valor });
    }
  }

  const custoTotal = fatias.reduce((acc, f) => acc + f.valor, 0);
  if (custoTotal === 0) return null;

  return {
    fatias,
    custoTotal,
    custoPorTonelada: volumeTon > 0 ? custoTotal / volumeTon : 0,
  };
}

/**
 * Calcula o custo total e por tonelada de um silo (versão resumida).
 * Delega para getCustoSiloDetalhado e descarta o breakdown.
 */
export async function getCustoSilo(silo: Silo): Promise<{ custoPorTonelada: number; custoTotal: number } | null> {
  const detalhado = await getCustoSiloDetalhado(silo);
  if (!detalhado) return null;
  return { custoPorTonelada: detalhado.custoPorTonelada, custoTotal: detalhado.custoTotal };
}
