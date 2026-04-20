// app/dashboard/silos/helpers.ts
import { type Silo, type MovimentacaoSilo } from '@/lib/supabase';

/**
 * Status possíveis de um silo
 */
export type SiloStatus = 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Crítico' | 'Esgotado';

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
 * Calcula o consumo diário médio baseado nas saídas desde a abertura.
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
    .filter((m) => m.tipo === 'Saída')
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
 * Determina o status do silo baseado em estoque, datas e volume ensilado.
 */
export function calcularStatusSilo(
  silo: Silo,
  estoque: number,
  movimentacoes: MovimentacaoSilo[]
): SiloStatus {
  const temEntradas = movimentacoes.some((m) => m.tipo === 'Entrada');

  // Sem nenhuma movimentação de entrada
  if (!temEntradas) return 'Vazio';

  // Tem entradas mas ainda não fechou
  if (temEntradas && !silo.data_fechamento) return 'Enchendo';

  // Fechado — tem data de fechamento mas não abriu ainda
  if (silo.data_fechamento && !silo.data_abertura_real) return 'Fechado';

  // Esgotado — já abriu e estoque zerou
  if (silo.data_abertura_real && estoque <= 0) return 'Esgotado';

  // Crítico — aberto e estoque abaixo de 10% do volume ensilado
  if (silo.data_abertura_real && silo.volume_ensilado_ton_mv) {
    const percentual = (estoque / silo.volume_ensilado_ton_mv) * 100;
    if (percentual <= 10) return 'Crítico';
  }

  // Aberto — tem data de abertura e ainda tem estoque
  if (silo.data_abertura_real && estoque > 0) return 'Aberto';

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
  dataFechamento?: string | null;
  dataAberturaReal?: string | null;
  dataAberturaP revista?: string | null;
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
    const status = calcularStatusSilo(silo, estoque, movsDoSilo);

    return {
      silo,
      estoque,
      msAtual: silo.materia_seca_percent,
      consumoDiario,
      estoquePara,
      status,
      dataFechamento: silo.data_fechamento,
      dataAberturaReal: silo.data_abertura_real,
      dataAberturaP revista: silo.data_abertura_prevista,
    };
  });
}
