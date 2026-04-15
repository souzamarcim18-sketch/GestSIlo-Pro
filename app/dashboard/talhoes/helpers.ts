import { type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';

const TIPOS_SOLO = [
  'Latossolo',
  'Argissolo',
  'Neossolo',
  'Cambissolo',
  'Gleissolo',
  'Nitossolo',
  'Chernossolos',
  'Outro',
];

const CULTURAS_SUPORTADAS = [
  'Milho Grão',
  'Milho Silagem',
  'Soja',
  'Feijão',
  'Sorgo Grão',
  'Sorgo Silagem',
  'Trigo',
  'Trigo Silagem',
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
};

/**
 * Matriz DAP para rebrota — apenas Sorgo Silagem
 */
export const MATRIZ_DAP_REBROTA: Record<string, DAPEntry[]> = {
  'Sorgo Silagem': [
    { tipo: 'Adubação de cobertura (N) - rebrota', dapInicio: 5, dapFim: 10 },
    { tipo: 'Colheita rebrota', dapInicio: 55, dapFim: 65 },
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
 * Dependente de: calcularCustoTotalEstimado (que usa dados de custo_total das atividades)
 * TODO [Bloco Frota/Insumos]: Garantir que custo_total seja calculado automaticamente
 */
export function calcularCustoPorHectare(custoTotal: number, areaHa: number): number {
  if (areaHa <= 0) return 0;
  return custoTotal / areaHa;
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
  const culturasSilagem = ['Milho Silagem', 'Sorgo Silagem', 'Trigo Silagem'];

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
 * Gera eventos DAP para um ciclo agrícola baseado na matriz DAP
 * @param cultura Nome da cultura
 * @param dataplantio Data de plantio (formato YYYY-MM-DD)
 * @param dataColheitaPrevista Data de colheita prevista (opcional, para validação)
 * @returns Array de objetos prontos para insert na tabela eventos_dap
 */
export function gerarEventosDAP(
  cultura: string,
  dataplantio: string,
  dataColheitaPrevista?: string
): any[] {
  const dapEntries = MATRIZ_DAP[cultura] || [];
  if (dapEntries.length === 0) return [];

  const plantioDate = new Date(dataplantio);
  const colheitaDate = dataColheitaPrevista ? new Date(dataColheitaPrevista) : null;

  const eventos: any[] = [];

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
): any[] {
  if (cultura !== 'Sorgo Silagem') return [];

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

// Constantes exportadas
export { TIPOS_SOLO, CULTURAS_SUPORTADAS };
