import { type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';

const TIPOS_SOLO = [
  'Argiloso',
  'Arenoso',
  'Siltoso',
];

const CULTURAS_SUPORTADAS = [
  // Com cronograma DAP
  'Milho Grão',
  'Milho Silagem',
  'Soja',
  'Feijão',
  'Sorgo Grão',
  'Sorgo Silagem',
  'Trigo',
  'Trigo Silagem',
  'Girassol Grão',
  'Girassol Silagem',
  'Milheto Grão',
  'Milheto Silagem',
  'Aveia Grão',
  'Aveia Silagem',
  'Cana-de-açúcar',
  // Perenes com rebrota
  'Capim Capiaçu',
  'Capim Cameroon',
  'Tifton',
  // Sem cronograma DAP (sem acompanhamento de operações)
  'Algodão',
  'Amendoim',
  'Mandioca',
  'Café',
  'Pastagem',
  'Outra',
];

/**
 * Estrutura para entrada DAP: tipo de operação + range de dias após plantio
 */
export interface DAPEntry {
  tipo: string;
  dapInicio: number;
  dapFim: number;
}

/**
 * Matriz DAP completa com todas as 8 culturas suportadas
 */
export const MATRIZ_DAP: Record<string, DAPEntry[]> = {
  'Milho Grão': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 25, dapFim: 35 },
    { tipo: 'Inseticida', dapInicio: 30, dapFim: 45 },
    { tipo: 'Fungicida 1ª aplicação', dapInicio: 45, dapFim: 55 },
    { tipo: 'Fungicida 2ª aplicação', dapInicio: 60, dapFim: 70 },
    { tipo: 'Colheita', dapInicio: 120, dapFim: 150 },
  ],
  'Milho Silagem': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 25, dapFim: 35 },
    { tipo: 'Inseticida', dapInicio: 30, dapFim: 45 },
    { tipo: 'Fungicida', dapInicio: 45, dapFim: 55 },
    { tipo: 'Colheita (ponto de silagem)', dapInicio: 90, dapFim: 120 },
  ],
  'Soja': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio + inoculação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 3 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Inseticida (percevejos/lagartas)', dapInicio: 30, dapFim: 45 },
    { tipo: 'Fungicida 1ª aplicação', dapInicio: 40, dapFim: 50 },
    { tipo: 'Fungicida 2ª aplicação', dapInicio: 55, dapFim: 65 },
    { tipo: 'Fungicida 3ª aplicação', dapInicio: 70, dapFim: 80 },
    { tipo: 'Colheita', dapInicio: 100, dapFim: 140 },
  ],
  'Feijão': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 3 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 3 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 20 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Inseticida', dapInicio: 25, dapFim: 40 },
    { tipo: 'Fungicida 1ª aplicação', dapInicio: 35, dapFim: 45 },
    { tipo: 'Fungicida 2ª aplicação', dapInicio: 50, dapFim: 60 },
    { tipo: 'Colheita', dapInicio: 75, dapFim: 95 },
  ],
  'Sorgo Grão': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 25, dapFim: 35 },
    { tipo: 'Inseticida', dapInicio: 35, dapFim: 50 },
    { tipo: 'Colheita', dapInicio: 100, dapFim: 130 },
  ],
  'Sorgo Silagem': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 25, dapFim: 35 },
    { tipo: 'Inseticida', dapInicio: 35, dapFim: 50 },
    { tipo: 'Colheita', dapInicio: 90, dapFim: 110 },
  ],
  'Trigo': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Fungicida 1ª aplicação', dapInicio: 40, dapFim: 50 },
    { tipo: 'Fungicida 2ª aplicação', dapInicio: 55, dapFim: 65 },
    { tipo: 'Inseticida (pulgões)', dapInicio: 60, dapFim: 80 },
    { tipo: 'Colheita', dapInicio: 100, dapFim: 130 },
  ],
  'Trigo Silagem': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Fungicida', dapInicio: 35, dapFim: 45 },
    { tipo: 'Colheita (ponto de silagem)', dapInicio: 60, dapFim: 80 },
  ],
  'Girassol Grão': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 5 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Inseticida', dapInicio: 30, dapFim: 45 },
    { tipo: 'Fungicida', dapInicio: 45, dapFim: 55 },
    { tipo: 'Colheita', dapInicio: 90, dapFim: 115 },
  ],
  'Girassol Silagem': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 1, dapFim: 5 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Inseticida', dapInicio: 30, dapFim: 45 },
    { tipo: 'Colheita (ponto de silagem)', dapInicio: 70, dapFim: 90 },
  ],
  'Milheto Grão': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Colheita', dapInicio: 80, dapFim: 100 },
  ],
  'Milheto Silagem': [
    { tipo: 'Dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Colheita (ponto de silagem)', dapInicio: 60, dapFim: 75 },
  ],
  'Aveia Grão': [
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 15, dapFim: 25 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Fungicida', dapInicio: 40, dapFim: 50 },
    { tipo: 'Colheita', dapInicio: 100, dapFim: 120 },
  ],
  'Aveia Silagem': [
    { tipo: 'Plantio', dapInicio: 0, dapFim: 5 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 30 },
    { tipo: 'Colheita (ponto de silagem)', dapInicio: 60, dapFim: 80 },
  ],
  'Cana-de-açúcar': [
    { tipo: 'Preparo / sulcação', dapInicio: 0, dapFim: 10 },
    { tipo: 'Plantio (toletes)', dapInicio: 0, dapFim: 15 },
    { tipo: 'Herbicida pré-emergente', dapInicio: 5, dapFim: 20 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 60, dapFim: 90 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 90, dapFim: 120 },
    { tipo: 'Colheita (1º corte)', dapInicio: 360, dapFim: 420 },
  ],
  'Capim Capiaçu': [
    { tipo: 'Preparo / dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 15 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 20, dapFim: 35 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 30, dapFim: 50 },
    { tipo: 'Corte (1º corte / silagem)', dapInicio: 120, dapFim: 180 },
  ],
  'Capim Cameroon': [
    { tipo: 'Preparo / dessecação', dapInicio: 0, dapFim: 5 },
    { tipo: 'Plantio', dapInicio: 0, dapFim: 15 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 20, dapFim: 35 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 30, dapFim: 50 },
    { tipo: 'Corte (1º corte / silagem)', dapInicio: 120, dapFim: 180 },
  ],
  'Tifton': [
    { tipo: 'Preparo / plantio (mudas)', dapInicio: 0, dapFim: 15 },
    { tipo: 'Adubação de cobertura (N)', dapInicio: 20, dapFim: 35 },
    { tipo: 'Herbicida pós-emergente', dapInicio: 25, dapFim: 40 },
    { tipo: 'Corte (feno)', dapInicio: 45, dapFim: 70 },
  ],
};

/**
 * Matriz DAP para rebrota — culturas com corte/colheita recorrente.
 * Os DAPs são contados a partir da data do corte/colheita anterior.
 */
export const MATRIZ_DAP_REBROTA: Record<string, DAPEntry[]> = {
  'Sorgo Silagem': [
    { tipo: 'Adubação de cobertura (N) - rebrota', dapInicio: 5, dapFim: 10 },
    { tipo: 'Colheita rebrota', dapInicio: 55, dapFim: 65 },
  ],
  'Capim Capiaçu': [
    { tipo: 'Adubação de cobertura (N) - rebrota', dapInicio: 5, dapFim: 15 },
    { tipo: 'Corte rebrota', dapInicio: 90, dapFim: 120 },
  ],
  'Capim Cameroon': [
    { tipo: 'Adubação de cobertura (N) - rebrota', dapInicio: 5, dapFim: 15 },
    { tipo: 'Corte rebrota', dapInicio: 90, dapFim: 120 },
  ],
  'Tifton': [
    { tipo: 'Adubação de cobertura (N) - rebrota', dapInicio: 3, dapFim: 10 },
    { tipo: 'Corte rebrota (feno)', dapInicio: 30, dapFim: 45 },
  ],
  'Cana-de-açúcar': [
    { tipo: 'Adubação de cobertura (N) - soca', dapInicio: 15, dapFim: 45 },
    { tipo: 'Colheita soca', dapInicio: 330, dapFim: 390 },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  'Em pousio': '#6B8E23',
  'Em preparação': '#FF9800',
  'Plantado': '#00A651',
  'Em colheita': '#FFC107',
  'Colhido': '#2196F3',
};

/**
 * Retorna label e cor para exibição do status do talhão
 */
export function getStatusDisplay(status: string): { label: string; color: string } {
  return {
    label: status || 'Desconhecido',
    color: STATUS_COLORS[status] || '#999999',
  };
}

/**
 * Calcula o custo total estimado de um talhão a partir de suas atividades
 * TODO [Bloco Frota/Insumos]: Validar integração com custo_hora de maquinas e preco_unitario de insumos
 */
export function calcularCustoTotalEstimado(atividades: AtividadeCampo[]): number {
  return atividades.reduce((total, atividade) => {
    return total + (atividade.custo_total || 0);
  }, 0);
}

/**
 * Calcula o custo por hectare
 */
export function calcularCustoPorHectare(custoTotal: number, areaHa: number): number {
  if (areaHa <= 0) return 0;
  return custoTotal / areaHa;
}

/**
 * Breakdown do custo de produção por componente.
 * Insumos: atividades com insumo_id (Calagem, Gessagem, Pulverização)
 * Máquinas: atividades com maquina_id e horas_maquina
 * Serviços: colheita/calagem terceirizada, irrigação, análise de solo
 * Outros: custo_manual sem categoria específica
 */
export function calcularBreakdownCusto(atividades: AtividadeCampo[]): {
  insumos: number;
  maquinas: number;
  servicos: number;
  outros: number;
} {
  const OPERACOES_INSUMO = ['Calagem', 'Gessagem', 'Pulverização', 'Adubação'];
  const OPERACOES_SERVICO = ['Análise de Solo', 'Irrigação'];

  let insumos = 0;
  let maquinas = 0;
  let servicos = 0;
  let outros = 0;

  for (const at of atividades) {
    const custo = at.custo_total || 0;
    if (custo === 0) continue;

    if (at.custo_manual && at.custo_manual > 0) {
      outros += at.custo_manual;
      continue;
    }

    const temInsumo = at.insumo_id && OPERACOES_INSUMO.includes(at.tipo_operacao);
    const temMaquina = at.maquina_id && at.horas_maquina;
    const ehServico = OPERACOES_SERVICO.includes(at.tipo_operacao) ||
      (at.tipo_operacao === 'Colheita' && at.valor_terceirizacao_r && at.valor_terceirizacao_r > 0) ||
      (at.tipo_operacao === 'Calagem' && at.valor_terceirizacao_r && at.valor_terceirizacao_r > 0);

    if (ehServico) {
      servicos += custo;
    } else if (temInsumo && temMaquina) {
      // Custo misto: separar proporcionalmente não é possível sem refazer o cálculo
      // Por ora, classificar pelo componente dominante
      insumos += custo * 0.6;
      maquinas += custo * 0.4;
    } else if (temInsumo) {
      insumos += custo;
    } else if (temMaquina) {
      maquinas += custo;
    } else {
      outros += custo;
    }
  }

  return { insumos, maquinas, servicos, outros };
}

/**
 * Calcula quantos dias passaram desde o plantio
 */
export function calcularDiasAposPlantio(dataplantio: string, dataAtual: string): number {
  const plantio = new Date(dataplantio);
  const atual = new Date(dataAtual);
  const diffMs = atual.getTime() - plantio.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se há alerta de colheita de silagem
 * Retorna null se não for silagem ou se ciclo já foi colhido
 * Retorna { ativo: true, diasRestantes: N } se faltam ≤7 dias
 */
export function verificarAlertaSilagem(
  ciclo: CicloAgricola
): { ativo: boolean; diasRestantes: number } | null {
  const culturasSilagem = [
    'Milho Silagem',
    'Sorgo Silagem',
    'Trigo Silagem',
    'Girassol Silagem',
    'Milheto Silagem',
    'Aveia Silagem',
    'Capim Capiaçu',
    'Capim Cameroon',
  ];

  if (!culturasSilagem.includes(ciclo.cultura)) return null;
  if (!ciclo.data_colheita_prevista || ciclo.data_colheita_real) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const colheita = new Date(ciclo.data_colheita_prevista);
  colheita.setHours(0, 0, 0, 0);
  const diffMs = colheita.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    ativo: diffDias <= 7 && diffDias >= 0,
    diasRestantes: Math.max(0, diffDias),
  };
}

/**
 * Severidade do alerta de colheita de um ciclo agrícola.
 * - `aviso`: colheita se aproxima (faltam ≤ 7 dias)
 * - `urgente`: colheita prevista é hoje ou venceu há até 7 dias
 * - `critico`: colheita venceu há mais de 7 dias sem registro
 */
export type SeveridadeColheita = 'aviso' | 'urgente' | 'critico';

export interface AlertaColheita {
  severidade: SeveridadeColheita;
  /** Dias até a colheita (positivo = futuro) ou desde o vencimento (negativo = atrasado) */
  diasRestantes: number;
  /** true quando a data prevista já passou sem colheita registrada */
  atrasado: boolean;
}

const JANELA_AVISO_COLHEITA_DIAS = 7;

/**
 * Converte uma string de data (YYYY-MM-DD ou ISO) em um Date à meia-noite LOCAL.
 * Datas no formato `YYYY-MM-DD` são interpretadas pelo JS como UTC; parseá-las
 * como local evita o deslocamento de 1 dia em fusos negativos (ex.: Brasil).
 */
function parseDataLocal(data: string): Date {
  const soData = data.slice(0, 10);
  const [ano, mes, dia] = soData.split('-').map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

/**
 * Verifica se um ciclo agrícola ativo merece um alerta de colheita — tanto pela
 * aproximação da janela quanto, principalmente, pelo vencimento sem registro.
 *
 * Diferente de `verificarAlertaSilagem` (restrito a silagens e à janela futura),
 * cobre QUALQUER cultura com `data_colheita_prevista` e inclui o caso de atraso.
 *
 * Retorna `null` quando: não há data prevista, a colheita já foi registrada, ou
 * a colheita está a mais de 7 dias no futuro (ainda não é alerta).
 */
export function verificarAlertaColheita(ciclo: CicloAgricola): AlertaColheita | null {
  if (!ciclo.data_colheita_prevista || ciclo.data_colheita_real) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const colheita = parseDataLocal(ciclo.data_colheita_prevista);

  const diasRestantes = Math.round((colheita.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  // Ainda longe (mais de 7 dias no futuro) — sem alerta
  if (diasRestantes > JANELA_AVISO_COLHEITA_DIAS) return null;

  if (diasRestantes >= 0) {
    return { severidade: 'aviso', diasRestantes, atrasado: false };
  }

  // Atrasado (diasRestantes negativo)
  const diasAtraso = Math.abs(diasRestantes);
  return {
    severidade: diasAtraso > JANELA_AVISO_COLHEITA_DIAS ? 'critico' : 'urgente',
    diasRestantes,
    atrasado: true,
  };
}

/**
 * Gera eventos DAP para um ciclo agrícola baseado na matriz DAP
 * @param cultura Nome da cultura
 * @param dataplantio Data de plantio (formato YYYY-MM-DD)
 * @param dataColheitaPrevista Data de colheita prevista (opcional, para validação)
 * @returns Array de objetos prontos para insert na tabela eventos_dap
 */
type EventoDAPInsert = { cultura: string; tipo_operacao: string; dias_apos_plantio: number; dias_apos_plantio_final: number; data_esperada: string; status: string };

export function gerarEventosDAP(
  cultura: string,
  dataplantio: string,
  dataColheitaPrevista?: string
): EventoDAPInsert[] {
  const dapEntries = MATRIZ_DAP[cultura] || [];
  if (dapEntries.length === 0) return [];

  const plantioDate = new Date(dataplantio);
  const colheitaDate = dataColheitaPrevista ? new Date(dataColheitaPrevista) : null;

  const eventos: EventoDAPInsert[] = [];

  for (const entry of dapEntries) {
    // Calcular data esperada usando o ponto médio do range DAP
    const dapMedio = Math.round((entry.dapInicio + entry.dapFim) / 2);
    const dataEsperada = new Date(plantioDate);
    dataEsperada.setDate(dataEsperada.getDate() + dapMedio);

    // Validar: não gerar eventos com data_esperada posterior à colheita prevista
    if (colheitaDate && dataEsperada > colheitaDate) {
      continue;
    }

    eventos.push({
      cultura,
      tipo_operacao: entry.tipo,
      dias_apos_plantio: entry.dapInicio,
      dias_apos_plantio_final: entry.dapFim,
      data_esperada: dataEsperada.toISOString().split('T')[0],
      status: 'Planejado',
    });
  }

  return eventos;
}

/**
 * Gera eventos DAP de rebrota (apenas para Sorgo Silagem)
 * @param cultura Nome da cultura (deve ser 'Sorgo Silagem')
 * @param dataColheitaReal Data da colheita real
 * @returns Array de objetos prontos para insert na tabela eventos_dap
 */
export function gerarEventosRebrota(
  cultura: string,
  dataColheitaReal: string
): EventoDAPInsert[] {
  const rebrotaEntries = MATRIZ_DAP_REBROTA[cultura] || [];
  if (rebrotaEntries.length === 0) return [];

  const colheitaDate = new Date(dataColheitaReal);

  return rebrotaEntries.map((entry) => {
    // Calcular data esperada usando o ponto médio do range DAP, baseado na colheita real
    const dapMedio = Math.round((entry.dapInicio + entry.dapFim) / 2);
    const dataEsperada = new Date(colheitaDate);
    dataEsperada.setDate(dataEsperada.getDate() + dapMedio);

    return {
      cultura,
      tipo_operacao: entry.tipo,
      dias_apos_plantio: entry.dapInicio,
      dias_apos_plantio_final: entry.dapFim,
      data_esperada: dataEsperada.toISOString().split('T')[0],
      status: 'Planejado',
    };
  });
}

/**
 * Estima a data de colheita prevista de um ciclo a partir da cultura e da data
 * de plantio. Usa o maior `dapFim` da matriz DAP da cultura (fim da janela de
 * colheita); para culturas sem cronograma, assume um ciclo de 365 dias.
 *
 * Usada quando o ciclo agrícola é criado automaticamente no primeiro registro
 * de preparo de solo/plantio — `data_colheita_prevista` é NOT NULL no banco.
 *
 * @param cultura Nome da cultura
 * @param dataPlantio Data de plantio (YYYY-MM-DD)
 * @returns Data prevista de colheita (YYYY-MM-DD)
 */
export function estimarDataColheita(cultura: string, dataPlantio: string): string {
  const entries = MATRIZ_DAP[cultura] ?? [];
  const maiorDapFim = entries.reduce((max, e) => Math.max(max, e.dapFim), 0);
  const dias = maiorDapFim > 0 ? maiorDapFim : 365;

  const base = new Date(dataPlantio);
  base.setDate(base.getDate() + dias);
  return base.toISOString().split('T')[0];
}

/**
 * Culturas propagadas por muda/tolete (plantio vegetativo) em vez de semente.
 * No plantio dessas culturas, o produtor seleciona uma muda da categoria de
 * insumo "Mudas" — não uma semente.
 */
const CULTURAS_PROPAGADAS_POR_MUDA = new Set<string>([
  'Cana-de-açúcar',
  'Capim Capiaçu',
  'Capim Cameroon',
  'Tifton',
]);

/**
 * Indica se a cultura é propagada por muda/tolete (plantio vegetativo).
 * Quando true, o formulário de plantio exibe o seletor de Mudas no lugar de Sementes.
 */
export function culturaUsaMudas(cultura: string): boolean {
  return CULTURAS_PROPAGADAS_POR_MUDA.has(cultura);
}

/**
 * Indica se a cultura possui cronograma de operações (matriz DAP).
 * Culturas sem matriz aparecem no cadastro, mas sem acompanhamento automático.
 */
export function culturaPossuiDAP(cultura: string): boolean {
  return (MATRIZ_DAP[cultura]?.length ?? 0) > 0;
}

/**
 * Indica se a cultura é perene/recorrente com geração de eventos de rebrota.
 */
export function culturaPossuiRebrota(cultura: string): boolean {
  return (MATRIZ_DAP_REBROTA[cultura]?.length ?? 0) > 0;
}

/**
 * Reconhece se um tipo de operação representa colheita/corte (fecha o ciclo
 * e dispara rebrota). Capins e Tifton usam o rótulo "Corte" em vez de "Colheita".
 */
export function ehOperacaoColheita(tipoOperacao: string): boolean {
  const t = tipoOperacao.toLowerCase();
  return t.includes('colheita') || t.includes('corte');
}

// Constantes exportadas
export { TIPOS_SOLO, CULTURAS_SUPORTADAS };
