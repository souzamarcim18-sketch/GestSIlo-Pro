/**
 * Tipos TypeScript para o módulo de Talhões
 * Baseado em: SPEC-talhoes.md (2026-04-15)
 */

// ========== ENUMS ==========

export enum StatusTalhao {
  POUSO = 'Em pousio',
  PREPARACAO = 'Em preparação',
  PLANTADO = 'Plantado',
  COLHEITA = 'Em colheita',
  COLHIDO = 'Colhido',
}

export enum TipoOperacao {
  // Preparo de Solo
  ARACAO = 'Aração',
  GRADAGEM = 'Gradagem',
  SUBSOLAGEM = 'Subsolagem',
  ESCARIFICACAO = 'Escarificação',
  NIVELAMENTO = 'Nivelamento',
  ROCAGEM = 'Roçagem',
  DESTORROAMENTO = 'Destorroamento',
  // Corretivos
  CALAGEM = 'Calagem',
  GESSAGEM = 'Gessagem',
  // Semeadura
  PLANTIO = 'Plantio',
  // Aplicações
  PULVERIZACAO = 'Pulverização',
  // Colheita
  COLHEITA = 'Colheita',
  // Análise
  ANALISE_SOLO = 'Análise de Solo',
  // Irrigação
  IRRIGACAO = 'Irrigação',
}

export enum CategoriaPulverizacao {
  HERBICIDA = 'Herbicida',
  INSETICIDA = 'Inseticida',
  FUNGICIDA = 'Fungicida',
  FERTILIZANTE_FOLIAR = 'Fertilizante Foliar',
  OUTROS = 'Outros',
}

// ========== TIPOS PRINCIPAIS ==========

export interface Talhao {
  id: string;
  fazenda_id: string;
  nome: string;
  area_ha: number;
  tipo_solo: string;
  status: StatusTalhao;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CicloAgricola {
  id: string;
  talhao_id: string;
  cultura: string;
  data_plantio: string;
  data_colheita_prevista: string;
  data_colheita_real?: string | null;
  produtividade_ton_ha?: number | null;
  custo_total_estimado?: number | null;
  permite_rebrota: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AtividadeCampo {
  id: string;
  ciclo_id: string;
  talhao_id: string;
  tipo_operacao: TipoOperacao;
  data: string;
  maquina_id?: string | null;
  horas_maquina?: number | null;
  observacoes?: string | null;
  custo_total: number;
  custo_manual?: number | null;

  // Preparo de Solo
  tipo_operacao_solo?: string | null;

  // Calagem / Gessagem
  insumo_id?: string | null;
  dose_ton_ha?: number | null;

  // Plantio
  semente_id?: string | null;
  populacao_plantas_ha?: number | null;
  sacos_ha?: number | null;
  espacamento_entre_linhas_cm?: number | null;

  // Pulverização
  categoria_pulverizacao?: CategoriaPulverizacao | null;
  dose_valor?: number | null;
  dose_unidade?: 'L/ha' | 'kg/ha' | null;
  volume_calda_l_ha?: number | null;

  // Colheita
  produtividade_ton_ha?: number | null;
  maquina_colheita_id?: string | null;
  horas_colheita?: number | null;
  maquina_transporte_id?: string | null;
  horas_transporte?: number | null;
  maquina_compactacao_id?: string | null;
  horas_compactacao?: number | null;
  valor_terceirizacao_r?: number | null;

  // Análise de Solo
  custo_amostra_r?: number | null;
  metodo_entrada?: 'Manual' | 'Upload PDF' | null;
  url_pdf_analise?: string | null;
  ph_cacl2?: number | null;
  mo_g_dm3?: number | null;
  p_mg_dm3?: number | null;
  k_mmolc_dm3?: number | null;
  ca_mmolc_dm3?: number | null;
  mg_mmolc_dm3?: number | null;
  al_mmolc_dm3?: number | null;
  h_al_mmolc_dm3?: number | null;
  s_mg_dm3?: number | null;
  b_mg_dm3?: number | null;
  cu_mg_dm3?: number | null;
  fe_mg_dm3?: number | null;
  mn_mg_dm3?: number | null;
  zn_mg_dm3?: number | null;
  sb_mmolc_dm3?: number | null;
  ctc_mmolc_dm3?: number | null;
  v_percent?: number | null;

  // Irrigação
  lamina_mm?: number | null;
  horas_irrigacao?: number | null;
  custo_por_hora_r?: number | null;

  created_at: string;
  updated_at: string;
}

export interface EventoDAP {
  id: string;
  ciclo_id: string;
  talhao_id: string;
  cultura: string;
  tipo_operacao: TipoOperacao;
  dias_apos_plantio: number;
  dias_apos_plantio_final?: number | null;
  data_esperada?: string | null;
  data_realizada?: string | null;
  status: 'Planejado' | 'Realizado' | 'Atrasado';
  atividade_campo_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnaliseSolo {
  id: string;
  atividade_id: string;
  ph_cacl2?: number | null;
  mo_g_dm3?: number | null;
  p_mg_dm3?: number | null;
  k_mmolc_dm3?: number | null;
  ca_mmolc_dm3?: number | null;
  mg_mmolc_dm3?: number | null;
  al_mmolc_dm3?: number | null;
  h_al_mmolc_dm3?: number | null;
  s_mg_dm3?: number | null;
  b_mg_dm3?: number | null;
  cu_mg_dm3?: number | null;
  fe_mg_dm3?: number | null;
  mn_mg_dm3?: number | null;
  zn_mg_dm3?: number | null;
  sb_mmolc_dm3?: number | null;
  ctc_mmolc_dm3?: number | null;
  v_percent?: number | null;
  created_at: string;
}

export interface ProximaOperacao {
  id: string;
  data_esperada: string;
  data_realizada?: string | null;
  tipo_operacao: string;
  status: 'Planejado' | 'Realizado' | 'Atrasado';
  cultura: string;
  talhao_nome: string;
}

// Type para criar/atualizar atividade de campo (sem id e timestamps)
export type AtividadeCampoInput = Omit<AtividadeCampo, 'id' | 'created_at' | 'updated_at'>;
