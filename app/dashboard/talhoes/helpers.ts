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

// Constantes exportadas
export { TIPOS_SOLO, CULTURAS_SUPORTADAS };
