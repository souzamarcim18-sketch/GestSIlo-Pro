import { type Silo, type MovimentacaoSilo } from '@/lib/supabase';

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
 * Calcula o consumo diário médio do silo
 */
export function calcularConsumoDiario(silo: Silo): number | null {
  return silo.consumo_medio_diario_ton || null;
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
 * Determina o status do silo baseado em estoque, capacidade, datas, etc.
 * Retorna: 'Enchendo', 'Fechado', 'Aberto', 'Vazio', 'Atenção'
 */
export function calcularStatusSilo(
  silo: Silo,
  estoque: number,
  dataFechamento?: string | null,
  dataAbertura?: string | null
): 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção' {
  const percentualOcupacao = (estoque / silo.capacidade) * 100;

  // Se vazio
  if (estoque === 0) return 'Vazio';

  // Se está alertando (ocupação muito alta ou baixa)
  if (percentualOcupacao > 90 || percentualOcupacao < 5) return 'Atenção';

  // Se fechado (tem data de fechamento e não tem data de abertura)
  if (dataFechamento && !dataAbertura) return 'Fechado';

  // Se aberto (tem data de abertura)
  if (dataAbertura) return 'Aberto';

  // Se enchendo (está com ocupação razoável e não foi fechado ainda)
  if (percentualOcupacao > 10 && percentualOcupacao < 90) return 'Enchendo';

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
  status: 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção';
  dataFechamento?: string | null;
  dataAbertura?: string | null;
}

/**
 * BATCH: Calcula dados de todos os silos em memória
 */
export function calcularDadosSilos(
  silos: Silo[],
  movimentacoes: MovimentacaoSilo[]
): SiloCardData[] {
  return silos.map((silo) => {
    // Filtrar movimentações do silo
    const movsDoSilo = movimentacoes.filter((m) => m.silo_id === silo.id);

    // Calcular estoque
    const estoque = calcularEstoque(movsDoSilo);

    // Consumo diário
    const consumoDiario = calcularConsumoDiario(silo);

    // Dias restantes
    const estoquePara = calcularEstoqueParaDias(estoque, consumoDiario);

    // Status
    const status = calcularStatusSilo(silo, estoque);

    return {
      silo,
      estoque,
      msAtual: silo.materia_seca_percent,
      consumoDiario,
      estoquePara,
      status,
      dataFechamento: null, // TODO: vir do banco se existir
      dataAbertura: null, // TODO: vir do banco se existir
    };
  });
}
