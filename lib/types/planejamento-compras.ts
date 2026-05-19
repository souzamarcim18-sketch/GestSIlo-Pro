// Enums
export const TIPOS_OPERACAO = [
  'Plantio',
  'Adubação de base',
  'Adubação de cobertura',
  'Pulverização',
  'Calagem',
  'Outro',
] as const;

export type TipoOperacao = (typeof TIPOS_OPERACAO)[number];

export const STATUS_PLANEJAMENTO = ['planejada', 'executada', 'cancelada'] as const;
export type StatusPlanejamento = (typeof STATUS_PLANEJAMENTO)[number];

export const STATUS_COMPRA = ['pendente', 'comprado_parcialmente', 'estoque_suficiente'] as const;
export type StatusCompra = (typeof STATUS_COMPRA)[number];

// Entidades do banco (espelham as tabelas)
export interface PlanejamentoAtividade {
  id: string;
  talhao_id: string;
  ciclo_id: string | null;
  tipo_operacao: TipoOperacao;
  data_prevista: string; // date ISO
  status: StatusPlanejamento;
  observacoes: string | null;
  fazenda_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanejamentoInsumo {
  id: string;
  planejamento_id: string;
  insumo_id: string;
  quantidade: number;
  fazenda_id: string;
  created_at: string;
}

// DTOs de leitura enriquecida
export interface PlanejamentoAtividadeComDetalhes extends PlanejamentoAtividade {
  talhao: { id: string; nome: string; area_ha: number | null };
  ciclo: { id: string; cultura: string } | null;
  insumos: PlanejamentoInsumoComInsumo[];
}

export interface PlanejamentoInsumoComInsumo extends PlanejamentoInsumo {
  insumo: {
    id: string;
    nome: string;
    unidade: string;
    estoque_atual: number;
    preco_unitario: number | null;
    ativo: boolean;
  };
}

// DTO do relatório consolidado (uma linha por insumo)
export interface LinhaRelatorioCompras {
  insumo_id: string;
  insumo_nome: string;
  unidade: string;
  total_planejado: number;
  estoque_atual: number;
  quantidade_a_comprar: number; // MAX(0, total_planejado - estoque_atual)
  preco_unitario: number | null;
  valor_estimado: number | null; // null se preco_unitario for null
  status_compra: StatusCompra;
  planejamentos_ids: string[]; // IDs das atividades que originaram a demanda
}

// Filtros do relatório
export interface FiltrosRelatorio {
  data_inicio?: string;
  data_fim?: string;
  talhao_id?: string;
  status_atividade?: StatusPlanejamento;
  apenas_com_necessidade?: boolean; // toggle "ocultar estoque suficiente"
}
