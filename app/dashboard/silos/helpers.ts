// app/dashboard/silos/helpers.ts
import { type Silo, type MovimentacaoSilo } from '@/lib/supabase';
import { getCustoSilo } from '@/lib/supabase/silos';
import { subtipoEhConsumoRebanho } from '@/lib/validations/silos';

/**
 * Status possíveis de um silo
 */
export type SiloStatus = 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Crítico' | 'Esgotado';

/**
 * Indica se uma movimentação é uma saída que conta como consumo do rebanho.
 * Fonte única de verdade em lib/validations/silos.ts (subtipoEhConsumoRebanho):
 * apenas 'Uso na alimentação' (e legados sem subtipo) contam. Venda,
 * Transferência e Descarte ficam de fora do consumo médio / autonomia.
 */
export function ehSaidaConsumo(mov: MovimentacaoSilo): boolean {
  return mov.tipo === 'Saída' && subtipoEhConsumoRebanho(mov.subtipo);
}

/**
 * Calcula o estoque atual de um silo baseado em suas movimentações.
 * Entrada = +, Saída = -
 */
export function calcularEstoque(movimentacoes: MovimentacaoSilo[]): number {
  return movimentacoes.reduce((acc, mov) => {
    return mov.tipo === 'Entrada' ? acc + mov.quantidade : acc - mov.quantidade;
  }, 0);
}

/**
 * Calcula o consumo diário médio baseado nas saídas de consumo desde a abertura.
 * Exclui Venda e Transferência (ver {@link ehSaidaConsumo}).
 * Retorna null se o silo não estiver aberto.
 */
export function calcularConsumoDiario(
  silo: Silo,
  movimentacoes: MovimentacaoSilo[]
): number | null {
  if (!silo.data_abertura_real) return null;

  const dataAbertura = new Date(silo.data_abertura_real);
  const hoje = new Date();
  const diasAberto = Math.max(
    1,
    Math.floor((hoje.getTime() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24))
  );

  const totalSaidas = movimentacoes
    .filter(ehSaidaConsumo)
    .reduce((acc, m) => acc + m.quantidade, 0);

  return totalSaidas > 0 ? totalSaidas / diasAberto : null;
}

/**
 * Calcula dias restantes de estoque
 */
export function calcularEstoqueParaDias(
  estoque: number,
  consumoDiario: number | null
): number | null {
  if (consumoDiario === null || consumoDiario === 0) return null;
  return Math.floor(estoque / consumoDiario);
}

/**
 * Calcula a autonomia estimada de um silo (em dias) contada **a partir da
 * primeira retirada de silagem** — não a partir da data de abertura.
 *
 * Consumo diário = total de saídas de consumo ÷ dias decorridos desde a 1ª
 * retirada de consumo. Exclui Venda e Transferência (ver {@link ehSaidaConsumo}).
 * Autonomia = estoque atual ÷ consumo diário.
 *
 * Retorna null se ainda não houve nenhuma saída de consumo.
 */
export function calcularAutonomiaPrimeiraRetirada(
  movimentacoes: MovimentacaoSilo[],
  estoque: number
): number | null {
  const saidas = movimentacoes.filter(ehSaidaConsumo);
  if (saidas.length === 0) return null;

  // Data da primeira retirada (menor data entre as saídas)
  const primeiraRetirada = saidas.reduce((menor, m) =>
    m.data < menor.data ? m : menor
  );

  const dataPrimeira = new Date(primeiraRetirada.data + 'T00:00:00');
  const hoje = new Date();
  const diasDecorridos = Math.max(
    1,
    Math.floor((hoje.getTime() - dataPrimeira.getTime()) / (1000 * 60 * 60 * 24))
  );

  const totalSaidas = saidas.reduce((acc, m) => acc + m.quantidade, 0);
  if (totalSaidas <= 0) return null;

  const consumoDiario = totalSaidas / diasDecorridos;
  if (consumoDiario <= 0) return null;

  return Math.floor(Math.max(estoque, 0) / consumoDiario);
}

/**
 * Calcula a taxa de perdas de um silo: total descartado ÷ silagem retirada do
 * silo para uso (consumo + descarte) (%).
 *
 * O denominador exclui Venda e Transferência: essas são saídas de
 * caixa/logística, não silagem "gasta" na operação — incluí-las diluiria a taxa
 * de perdas de forma enganosa (uma venda grande faria as perdas parecerem
 * menores). Retorna null se ainda não houve consumo nem descarte.
 */
export function calcularTaxaPerdasSilo(
  movimentacoes: MovimentacaoSilo[]
): number | null {
  const totalDescarte = movimentacoes
    .filter((m) => m.tipo === 'Saída' && m.subtipo === 'Descarte')
    .reduce((acc, m) => acc + m.quantidade, 0);

  const totalConsumo = movimentacoes
    .filter(ehSaidaConsumo)
    .reduce((acc, m) => acc + m.quantidade, 0);

  const baseUso = totalConsumo + totalDescarte;
  if (baseUso <= 0) return null;

  return (totalDescarte / baseUso) * 100;
}

/** Dias desde a última saída de consumo (ou null se nunca houve). */
export function diasDesdeUltimaRetirada(
  movimentacoes: MovimentacaoSilo[]
): number | null {
  const saidas = movimentacoes.filter(ehSaidaConsumo);
  if (saidas.length === 0) return null;
  const ultima = saidas.reduce((maior, m) => (m.data > maior.data ? m : maior));
  const dataUltima = new Date(ultima.data + 'T00:00:00');
  const hoje = new Date();
  return Math.max(
    0,
    Math.floor((hoje.getTime() - dataUltima.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/**
 * Sinaliza um silo aberto que parou de consumir (≥ 3 dias sem retirada de
 * alimentação, ou aberto há ≥ 3 dias e nunca consumido). Espelha o alerta
 * `silo_aberto_sem_consumo` do dashboard, mas em forma pura para o card.
 */
export function siloAbertoSemConsumo(
  silo: Silo,
  estoque: number,
  movimentacoes: MovimentacaoSilo[]
): boolean {
  if (!silo.data_abertura_real || estoque <= 0) return false;
  const dias = diasDesdeUltimaRetirada(movimentacoes);
  if (dias === null) {
    const abertura = new Date(silo.data_abertura_real + 'T00:00:00');
    const diasAberto = Math.floor(
      (Date.now() - abertura.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diasAberto >= 3;
  }
  return dias >= 3;
}

/**
 * Determina o status do silo. Fonte única de verdade do status na UI.
 *
 * O limiar de "Crítico" é baseado na AUTONOMIA (dias restantes < 10), não em %
 * do volume — dias restantes é o que importa para o produtor. Cai para o % de
 * volume apenas quando não há consumo calculável (silo aberto recém-aberto).
 */
export function calcularStatusSilo(
  silo: Silo,
  estoque: number,
  movimentacoes: MovimentacaoSilo[],
  estoquePara?: number | null
): SiloStatus {
  const temEntradas = movimentacoes.some((m) => m.tipo === 'Entrada');

  // Sem nenhuma movimentação de entrada
  if (!temEntradas) return 'Vazio';

  // Tem entradas mas ainda não fechou (fase de enchimento do silo)
  if (!silo.data_fechamento) return 'Enchendo';

  // Fechado — tem data de fechamento mas não abriu ainda
  if (silo.data_fechamento && !silo.data_abertura_real) return 'Fechado';

  // Esgotado — já abriu e estoque zerou
  if (silo.data_abertura_real && estoque <= 0) return 'Esgotado';

  // Crítico — aberto e com autonomia curta (< 10 dias). Fallback para % de
  // volume quando não há consumo registrado para estimar autonomia.
  if (silo.data_abertura_real && estoque > 0) {
    if (estoquePara != null) {
      if (estoquePara < 10) return 'Crítico';
    } else if (silo.volume_ensilado_ton_mv) {
      const percentual = (estoque / silo.volume_ensilado_ton_mv) * 100;
      if (percentual <= 10) return 'Crítico';
    }
    return 'Aberto';
  }

  return 'Fechado';
}

/**
 * Interface para dados pré-calculados de um silo
 */
export interface SiloCardData {
  silo: Silo;
  estoque: number;
  msAtual: number | null;
  consumoDiario: number | null;
  estoquePara: number | null;
  status: SiloStatus;
  /** Silo aberto que parou de consumir (≥ 3 dias sem retirada). */
  abertoSemConsumo: boolean;
  dataFechamento?: string | null;
  dataAberturaReal?: string | null;
  dataAberturaPrevia?: string | null;
}

/**
 * BATCH: Calcula dados de todos os silos em memória
 */
export function calcularDadosSilos(
  silos: Silo[],
  movimentacoes: MovimentacaoSilo[]
): SiloCardData[] {
  return silos.map((silo) => {
    const movsDoSilo = movimentacoes.filter((m) => m.silo_id === silo.id);

    const estoque = calcularEstoque(movsDoSilo);
    const consumoDiario = calcularConsumoDiario(silo, movsDoSilo);
    const estoquePara = calcularEstoqueParaDias(estoque, consumoDiario);
    const status = calcularStatusSilo(silo, estoque, movsDoSilo, estoquePara);
    const abertoSemConsumo = siloAbertoSemConsumo(silo, estoque, movsDoSilo);

    return {
      silo,
      estoque,
      msAtual: silo.materia_seca_percent,
      consumoDiario,
      estoquePara,
      status,
      abertoSemConsumo,
      dataFechamento: silo.data_fechamento,
      dataAberturaReal: silo.data_abertura_real,
      dataAberturaPrevia: silo.data_abertura_prevista,
    };
  });
}

/**
 * Resumo agregado de toda a frota de silos (somatórios para a faixa de KPIs)
 */
export interface ResumoFrotaSilos {
  /** Soma do estoque atual de todos os silos (toneladas, nunca negativo) */
  estoqueTotal: number;
  /** Soma do consumo diário médio dos silos abertos (toneladas/dia) */
  consumoDiarioFrota: number | null;
  /** Autonomia estimada da frota inteira em dias (estoque total ÷ consumo diário) */
  autonomiaDias: number | null;
  /** % de perdas: descartes ÷ total de saídas de todos os silos */
  taxaPerdas: number | null;
}

/**
 * Calcula os indicadores agregados da frota a partir dos dados já pré-calculados
 * de cada silo e do histórico completo de movimentações.
 *
 * - Estoque total: soma do estoque (não negativo) de cada silo.
 * - Consumo diário da frota: soma dos consumos diários médios (desde a abertura)
 *   dos silos que já estão abertos.
 * - Autonomia: estoque total ÷ consumo diário da frota.
 * - % de perdas: total descartado ÷ total de saídas (todo o histórico).
 */
export function calcularResumoFrota(
  siloCardData: SiloCardData[],
  movimentacoes: MovimentacaoSilo[]
): ResumoFrotaSilos {
  const estoqueTotal = siloCardData.reduce((acc, d) => acc + Math.max(d.estoque, 0), 0);

  const consumosAbertos = siloCardData
    .map((d) => d.consumoDiario)
    .filter((v): v is number => v !== null && v > 0);
  const consumoDiarioFrota =
    consumosAbertos.length > 0 ? consumosAbertos.reduce((a, b) => a + b, 0) : null;

  const autonomiaDias =
    consumoDiarioFrota !== null && consumoDiarioFrota > 0
      ? Math.floor(estoqueTotal / consumoDiarioFrota)
      : null;

  // Taxa de perdas da frota: descarte ÷ (consumo + descarte) — mesma base do
  // silo individual (exclui Venda/Transferência).
  const totalDescarte = movimentacoes
    .filter((m) => m.tipo === 'Saída' && m.subtipo === 'Descarte')
    .reduce((acc, m) => acc + m.quantidade, 0);
  const totalConsumo = movimentacoes
    .filter(ehSaidaConsumo)
    .reduce((acc, m) => acc + m.quantidade, 0);
  const baseUso = totalConsumo + totalDescarte;
  const taxaPerdas = baseUso > 0 ? (totalDescarte / baseUso) * 100 : null;

  return { estoqueTotal, consumoDiarioFrota, autonomiaDias, taxaPerdas };
}

/**
 * Calcula o custo médio da tonelada de silagem da propriedade inteira:
 * soma o custo total de todos os silos que têm base de custo e divide pela
 * soma das toneladas de silagem produzida (volume ensilado) desses silos.
 *
 * Diferente do custo/ton de cada silo individual — é a média ponderada pelo
 * volume de toda a fazenda. Retorna null se nenhum silo tiver base de custo.
 */
export async function calcularCustoMedioToneladaPropriedade(
  silos: Silo[]
): Promise<number | null> {
  const resultados = await Promise.all(
    silos.map(async (silo) => {
      const custo = await getCustoSilo(silo);
      return { custo, volume: silo.volume_ensilado_ton_mv ?? 0 };
    })
  );

  let custoTotalFrota = 0;
  let volumeTotalFrota = 0;
  for (const { custo, volume } of resultados) {
    if (custo === null || volume <= 0) continue;
    custoTotalFrota += custo.custoTotal;
    volumeTotalFrota += volume;
  }

  if (volumeTotalFrota <= 0) return null;
  return custoTotalFrota / volumeTotalFrota;
}
