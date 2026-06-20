import type { ProximaOperacao } from '@/lib/types/talhoes';
import type { EventoCalendario } from '@/lib/types/calendario';
import type { PlanoSlug } from '@/lib/planos';

export interface ProximaOperacaoComBadge extends ProximaOperacao {
  janelaColheita?: { ativo: boolean; diasRestantes: number };
}

export type AlertaTipo =
  | 'operacao_atrasada'
  | 'colheita_pendente'
  | 'silagem_baixa_autonomia'
  | 'silagem_perdas_elevadas'
  | 'manutencao_pendente'
  | 'manutencao_vencida'
  | 'manutencao_urgente'
  | 'insumo_critico'
  | 'insumo_urgente'
  | 'produto_urgente'
  | 'vacinacao_vencida'
  | 'vacinacao_urgente'
  | 'piquete_superlotacao'
  | 'piquete_pronto_entrada'
  | 'piquete_reforma_longa'
  | 'piquete_ocupacao_vencida'
  | 'piquete_necessita_reforma'
  | 'silo_aberto_sem_consumo';

export type AlertaSeveridade = 'critico' | 'urgente' | 'aviso';

export interface AlertaCritico {
  id: string;
  tipo: AlertaTipo;
  severidade: AlertaSeveridade;
  mensagem: string;
  detalhe?: string;
  href: string;
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
  receitaMesNum: number;
  despesaMesNum: number;
  receitaVariacaoPct: number | null;
  despesaVariacaoPct: number | null;
  saldoAcumuladoNum: number;
  consumoSparkline: number[];
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
  // Pastagens
  totalPiquetes: number;
  piquetesEmPastejo: number;
  piquetesProntosEntrada: number;
  piquetesEmReforma: number;
  pastagensAreaTotalHa: number;
  pastagensCount: number;
  // Campos numéricos brutos para alertas
  silosAutonomiaDiasNum: number | null;
  silosTaxaPerdasNum: number | null;
  manutencoesPendentesCount: number;
  // Alertas derivados
  alertas: AlertaCritico[];
  // Atividades Recentes (últimas 48h, max 8)
  atividadesRecentes: EventoCalendario[];
  // Plano da fazenda
  planoAtual: PlanoSlug;
}
