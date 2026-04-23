import type { Maquina, UsoMaquina, Manutencao, Abastecimento, PlanoManutencao } from '../supabase';

// ── Tipos internos ────────────────────────────────────────────────────────────

export type CustoHoraParams = {
  maquina: Maquina;
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
  horasNoAno: number;
};

export type CustoHoraResult = {
  fixo: number;
  combustivel: number;
  manutencao: number;
  total: number;
};

export type AlertaManutencao = {
  emAlerta: boolean;
  urgente: boolean;
  horasRestantes: number | null;
};

export type CustoMaquinaRow = {
  maquina: Maquina;
  custoHora: CustoHoraResult;
  horasTotais: number;
  ranking: number;
};

// ── Funções puras ─────────────────────────────────────────────────────────────

/**
 * Custo de depreciação por hora trabalhada.
 * Fórmula: (valor_aquisicao - valor_residual) / vida_util_anos / horasNoAno
 * Retorna 0 se qualquer denominador for zero ou dados insuficientes.
 */
export function calcularDepreciacaoPorHora(maquina: Maquina, horasNoAno: number): number {
  const { valor_aquisicao, valor_residual, vida_util_anos } = maquina;
  if (!valor_aquisicao || !vida_util_anos || vida_util_anos <= 0 || horasNoAno <= 0) return 0;
  const residual = valor_residual ?? 0;
  const resultado = (valor_aquisicao - residual) / vida_util_anos / horasNoAno;
  return isFinite(resultado) ? resultado : 0;
}

/**
 * Custo de combustível por hora trabalhada.
 * Fórmula: SUM(valor dos abastecimentos) / horasTotais
 * Retorna 0 se horasTotais for zero.
 */
export function calcularCustoCombustivelPorHora(abastecimentos: Abastecimento[], horasTotais: number): number {
  if (horasTotais <= 0) return 0;
  const totalValor = abastecimentos.reduce((soma, a) => soma + (a.valor ?? 0), 0);
  const resultado = totalValor / horasTotais;
  return isFinite(resultado) ? resultado : 0;
}

/**
 * Custo de manutenção por hora trabalhada.
 * Fórmula: SUM(custo das manutenções) / horasTotais
 * Retorna 0 se horasTotais for zero.
 */
export function calcularCustoManutencaoPorHora(manutencoes: Manutencao[], horasTotais: number): number {
  if (horasTotais <= 0) return 0;
  const totalCusto = manutencoes.reduce((soma, m) => soma + (m.custo ?? 0), 0);
  const resultado = totalCusto / horasTotais;
  return isFinite(resultado) ? resultado : 0;
}

/**
 * Custo total por hora agregando depreciação, combustível e manutenção.
 */
export function calcularCustoTotalPorHora(params: CustoHoraParams): CustoHoraResult {
  const { maquina, abastecimentos, manutencoes, horasNoAno } = params;
  const fixo = calcularDepreciacaoPorHora(maquina, horasNoAno);
  const combustivel = calcularCustoCombustivelPorHora(abastecimentos, horasNoAno);
  const manutencao = calcularCustoManutencaoPorHora(manutencoes, horasNoAno);
  return { fixo, combustivel, manutencao, total: fixo + combustivel + manutencao };
}

/**
 * Consumo médio real de combustível em litros por hora.
 * Fórmula: SUM(litros) / SUM(horas trabalhadas)
 * Retorna null se o total de horas for zero (evita divisão por zero).
 */
export function calcularConsumoMedioReal(abastecimentos: Abastecimento[], usos: UsoMaquina[]): number | null {
  const totalLitros = abastecimentos.reduce((soma, a) => soma + (a.litros ?? 0), 0);
  const totalHoras = usos.reduce((soma, u) => soma + (u.horas ?? 0), 0);
  if (totalHoras <= 0) return null;
  const resultado = totalLitros / totalHoras;
  return isFinite(resultado) ? resultado : null;
}

/**
 * Detecta anomalia de consumo quando o valor atual supera a média histórica
 * em mais que o limiar (padrão 30%).
 * Retorna false se a média histórica for zero ou negativa.
 */
export function detectarAnomaliaConsumo(consumoAtual: number, mediaHistorica: number, limiar = 0.3): boolean {
  if (mediaHistorica <= 0) return false;
  return consumoAtual > mediaHistorica * (1 + limiar);
}

/**
 * Rendimento operacional em hectares por hora.
 * Retorna null se area_ha ou horas estiverem ausentes ou horas for zero.
 */
export function calcularRendimentoOperacional(uso: UsoMaquina): number | null {
  const { area_ha, horas } = uso;
  if (area_ha == null || horas == null || horas <= 0) return null;
  const resultado = area_ha / horas;
  return isFinite(resultado) ? resultado : null;
}

/**
 * Verifica se um plano de manutenção está em alerta baseado no horímetro atual.
 * - emAlerta: horasRestantes <= 10% do intervalo_horas
 * - urgente: horasRestantes <= 0 (manutenção vencida)
 * - horasRestantes: null se dados de intervalo ou horímetro base estiverem ausentes
 */
export function verificarAlertaPlanoManutencao(
  plano: PlanoManutencao,
  horimetroAtual: number
): AlertaManutencao {
  const { intervalo_horas, horimetro_base } = plano;
  if (intervalo_horas == null || horimetro_base == null) {
    return { emAlerta: false, urgente: false, horasRestantes: null };
  }
  const proximaManutencao = horimetro_base + intervalo_horas;
  const horasRestantes = proximaManutencao - horimetroAtual;
  const urgente = horasRestantes <= 0;
  const limiarAlerta = intervalo_horas * 0.1;
  const emAlerta = horasRestantes <= limiarAlerta;
  return { emAlerta, urgente, horasRestantes };
}

/**
 * Filtra manutenções pelo período, usando data_realizada com fallback para
 * data_prevista. Datas inválidas são descartadas silenciosamente.
 */
export function filtrarManutencoesPorPeriodo(
  manutencoes: Manutencao[],
  inicio: Date,
  fim: Date
): Manutencao[] {
  return manutencoes.filter((m) => {
    const dataStr = m.data_realizada ?? m.data_prevista;
    if (!dataStr) return false;
    const data = new Date(dataStr);
    if (isNaN(data.getTime())) return false;
    return data >= inicio && data <= fim;
  });
}

/**
 * Agrupa e calcula custos operacionais por máquina, retornando uma linha por
 * máquina com custo por hora e ranking (1 = mais caro).
 */
export function agruparCustosPorMaquina(
  maquinas: Maquina[],
  abastecimentos: Abastecimento[],
  manutencoes: Manutencao[],
  usos: UsoMaquina[]
): CustoMaquinaRow[] {
  const rows: CustoMaquinaRow[] = maquinas.map((maquina) => {
    const maqAbastecimentos = abastecimentos.filter((a) => a.maquina_id === maquina.id);
    const maqManutencoes = manutencoes.filter((m) => m.maquina_id === maquina.id);
    const maqUsos = usos.filter((u) => u.maquina_id === maquina.id);
    const horasTotais = maqUsos.reduce((soma, u) => soma + (u.horas ?? 0), 0);
    const custoHora = calcularCustoTotalPorHora({
      maquina,
      abastecimentos: maqAbastecimentos,
      manutencoes: maqManutencoes,
      horasNoAno: horasTotais,
    });
    return { maquina, custoHora, horasTotais, ranking: 0 };
  });

  rows.sort((a, b) => b.custoHora.total - a.custoHora.total);
  rows.forEach((row, i) => {
    row.ranking = i + 1;
  });

  return rows;
}
