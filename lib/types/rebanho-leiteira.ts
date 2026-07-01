// Tipos para o módulo de Gestão Leiteira

export type TurnoProducao = 'manha' | 'tarde' | 'noite' | 'dia_inteiro';

export const TURNO_LABELS: Record<TurnoProducao, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  dia_inteiro: 'Dia Inteiro',
};

export interface ProducaoLeiteira {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data: string; // ISO date
  turno: TurnoProducao;
  volume_litros: number;
  // CCS em mil células/mL — laudo opcional (entrada manual). Opcional no tipo
  // pois nem toda leitura/legado traz a coluna.
  ccs_mil_cel_ml?: number | null;
  observacoes: string | null;
  usuario_id: string;
  created_at: string;
}

export type ProducaoLeiteiraInput = Omit<
  ProducaoLeiteira,
  'id' | 'fazenda_id' | 'created_at'
>;

// Indicadores Leiteiros (calculados no serviço)
export interface IndicadoresLeiteiros {
  producao_media_diaria_litros: number; // total_litros / dias no período
  producao_total_periodo_litros: number; // soma do período
  vacas_em_lactacao: number; // count de animais com status_reprodutivo='lactacao'
  producao_media_por_vaca: number; // producao_total / vacas_em_lactacao
  duracao_media_lactacoes_dias: number; // média dos dias de lactação nas lactações encerradas
  percentual_vacas_em_lactacao: number; // vacas_em_lactacao / total_femeas_adultas * 100
  // Integração com silos (requer buscarConsumoSilagemPeriodo)
  eficiencia_alimentar_litros_por_kg_ms: number | null; // litros / kg MS (null se sem dados silos)
}
