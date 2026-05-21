import type { ProximaOperacao } from '@/lib/types/talhoes';

export interface ProximaOperacaoComBadge extends ProximaOperacao {
  janelaColheita?: { ativo: boolean; diasRestantes: number };
}

export interface DashboardData {
  // Silagem
  silosOcupacaoPct: string;
  silosDetalhe: string;
  silosTotalCadastrados: string;
  silosAutonomiaDias: string;
  silosConsumoDiario: string;
  silosAbertos: string;
  silosAbertosDetalhe: string;
  silosTaxaPerdas: string;
  silosCulturasEnsiladas: string;
  silosUltimaAbertura: string;
  silosUltimaAberturaDetalhe: string;
  silosOcupacaoPctNum: number;
  silosGaugeDetalhe: string;
  silosAbertosNomes: string[];
  culturasEnsiladas: { name: string; value: number; pct: number }[];
  // Lavouras
  talhaoAreaTotal: string;
  talhaoTotalCadastrados: string;
  culturasAtivas: { name: string; value: number }[];
  // Financeiro
  receitaMes: string;
  despesaMes: string;
  // Frota
  maquinasTotal: string;
  maquinasDetalhe: string;
  // Rebanho
  totalAnimais: number;
  categoriasRebanho: { name: string; value: number }[];
  composicaoRebanho: { name: string; value: number; pct: number }[];
  lotesAtivos: { id: string; nome: string; quantidade_animais?: number | null }[];
  // Operações
  proximasOperacoes: ProximaOperacaoComBadge[];
}
