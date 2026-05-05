// lib/types/planejamento-silagem.ts

export type TipoRebanho = 'Leite' | 'Corte';
export type SistemaProducao = 'pasto' | 'semiconfinado' | 'confinado';
export type ModoSnapshotRebanho = 'PROJETADO' | 'PROJETADO_EDITADO' | 'MANUAL';

export interface DefinicaoSistema {
  tipo_rebanho: TipoRebanho;
  sistema_producao: SistemaProducao;
  fator_consumo: number;      // 0.90, 1.00 ou 1.10
  fator_silagem: number;      // 0.70, 1.00 ou 1.15
}

export interface CategoriaPreDefinida {
  id: string;              // "L1", "C4", etc.
  nome: string;
  tipo_rebanho: TipoRebanho;
  pv_ref_kg: number;
  cms_base_kg_dia: number;
  pct_silagem_base: number;  // 0.35 a 0.75 (decimal)
}

export interface CategoriaComQuantidade extends CategoriaPreDefinida {
  quantidade_cabecas: number;
}

export interface ParametrosPlanejamento {
  periodo_dias: number;          // 1-365
  cultura: 'Milho' | 'Sorgo';
  teor_ms_percent: number;       // 25-40
  perdas_percent: number;        // 15-30
  produtividade_ton_mo_ha: number;
  taxa_retirada_kg_m2_dia: number; // 200-350
}

export interface RebanhoSnapshot {
  modo: ModoSnapshotRebanho;
  usuario_editou: boolean;
  composicao: Array<{ categoria_id: string; quantidade: number }>;
  total_cabecas: number;
  partos_inclusos: number;
  data_calculo: string;
  data_projecao: string;
}

export interface WizardState {
  sistema: DefinicaoSistema | null;
  rebanho: Record<string, number>;           // {categoryId: quantidade}
  parametros: ParametrosPlanejamento | null;
  dataAlvo: Date | null;
  rebanhoSnapshot: RebanhoSnapshot | null;
}

export interface CategoriaCalculo extends CategoriaComQuantidade {
  cms_ajust_kg_dia: number;
  pct_silagem_ajust: number;
  silagem_ms_dia_kg: number;
  demanda_ms_ton: number;
  participacao_pct: number;
}

export interface ResultadosPlanejamento {
  demanda_ms_total_ton: number;
  demanda_mo_sem_perdas_ton: number;
  demanda_mo_com_perdas_ton: number;
  consumo_diario_mo_kg: number;
  area_plantio_ha: number;
  area_painel_m2: number;
  categorias_calculo: CategoriaCalculo[];
}

export interface AlertaPlanejamento {
  tipo: 'warning' | 'info';
  mensagem: string;
}

export interface PlanejamentoSilagem {
  id: string;
  fazenda_id: string;
  nome: string;
  sistema: DefinicaoSistema;
  rebanho: CategoriaComQuantidade[];
  parametros: ParametrosPlanejamento;
  resultados: ResultadosPlanejamento;
  rebanho_snapshot?: RebanhoSnapshot;
  created_at: string;
}
