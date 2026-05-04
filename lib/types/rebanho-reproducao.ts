// Tipos de Reprodução — Alinhados com schema real do banco (20260502000002_rebanho_fase2_main.sql)

// Tipos de Reprodutor
export interface Reprodutor {
  id: string;
  fazenda_id: string;
  nome: string;
  tipo: 'touro' | 'semen_ia' | 'touro_teste';
  raca: string | null;
  numero_registro: string | null;
  data_entrada: string | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Tipos de Eventos Reprodutivos (alinhados com eventos_rebanho.tipo_cobertura CHECK)
export interface EventoCobertura {
  animal_id: string;
  tipo: 'cobertura';
  data_evento: string;
  // Bate com CHECK em eventos_rebanho.tipo_cobertura
  tipo_cobertura: 'monta_natural' | 'ia_convencional' | 'iatf' | 'tetf' | 'fiv' | 'repasse';
  reprodutor_id: string;
  observacoes?: string | null;
}

export interface EventoDiagnostico {
  animal_id: string;
  tipo: 'diagnostico_prenhez';
  data_evento: string;
  // Bate com CHECK em eventos_rebanho.metodo_diagnostico
  metodo_diagnostico: 'palpacao' | 'ultrassom' | 'sangue';
  // Bate com CHECK em eventos_rebanho.resultado_prenhez (trigger usa 'duvidoso')
  resultado_prenhez: 'positivo' | 'negativo' | 'duvidoso';
  idade_gestacional_dias?: number | null;
  observacoes?: string | null;
}

export interface EventoParto {
  animal_id: string;
  tipo: 'parto';
  data_evento: string;
  tipo_parto: 'normal' | 'distocico' | 'cesariana';
  gemelar: boolean;
  natimorto: boolean;
  crias: Array<{
    // Mantém literal 'Fêmea' com acento (bate com CHECK do banco)
    sexo: 'Macho' | 'Fêmea';
    peso_kg?: number | null;
    vivo: boolean;
  }>;
  observacoes?: string | null;
  // Obrigatório se não há prenhez confirmada (bypass de admin)
  bypass_justificativa?: string | null;
}

export interface EventoSecagem {
  animal_id: string;
  tipo: 'secagem';
  data_evento: string;
  observacoes?: string | null;
}

export interface EventoAborto {
  animal_id: string;
  tipo: 'aborto';
  data_evento: string;
  idade_gestacional_dias?: number | null;
  causa_aborto?: string | null;
  observacoes?: string | null;
}

export interface EventoDescarte {
  animal_id: string;
  tipo: 'descarte';
  data_evento: string;
  // Bate com CHECK em eventos_rebanho.motivo_descarte
  motivo_descarte: 'idade' | 'reprodutivo' | 'sanitario' | 'producao' | 'aprumos' | 'outro';
  observacoes?: string | null;
}

export type EventoReprodutivo =
  | EventoCobertura
  | EventoDiagnostico
  | EventoParto
  | EventoSecagem
  | EventoAborto
  | EventoDescarte;

export type TipoCoberturaEnum = 'monta_natural' | 'ia_convencional' | 'iatf' | 'tetf' | 'fiv' | 'repasse';
export type MetodoDiagnosticoEnum = 'palpacao' | 'ultrassom' | 'sangue';
export type ResultadoDiagnosticoEnum = 'positivo' | 'negativo' | 'duvidoso';
export type TipoPartoEnum = 'normal' | 'distocico' | 'cesariana';
export type MotivoDescarteEnum = 'idade' | 'reprodutivo' | 'sanitario' | 'producao' | 'aprumos' | 'outro';
export type StatusReprodutivo = 'vazia' | 'inseminada' | 'prenha' | 'lactacao' | 'seca' | 'descartada';
export type TipoReprodutorEnum = 'touro' | 'semen_ia' | 'touro_teste';

// ========== ADIÇÕES — TABELAS DO BANCO SEM TIPO ==========

// Tabela parametros_reprodutivos_fazenda (Seção 1.5)
export interface ParametrosReprodutivosFazenda {
  id: string;
  fazenda_id: string;
  dias_gestacao: number;
  dias_seca: number;
  pve_dias: number;
  coberturas_para_repetidora: number;
  janela_repetidora_dias: number;
  meta_taxa_prenhez_pct: number;
  meta_psm_dias: number;
  meta_iep_dias: number;
  created_at: string;
  updated_at: string;
}

// Tabela lactacoes (Seção 1.4)
export interface Lactacao {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_inicio_parto: string;
  data_fim_secagem: string | null;
  producao_total_litros: number | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Tabela eventos_parto_crias (Seção 1.6)
export interface EventoPartoCria {
  id: string;
  evento_id: string;
  fazenda_id: string;
  // Mantém literal 'Fêmea' com acento (bate com CHECK do banco)
  sexo: 'Macho' | 'Fêmea';
  peso_kg: number | null;
  vivo: boolean;
  animal_criado_id: string | null;
  created_at: string;
}

// Tabela audit_log (para rastreabilidade de eventos críticos)
export interface AuditLog {
  id: string;
  fazenda_id: string;
  usuario_id: string;
  tabela: string;
  registro_id: string;
  acao: 'insert' | 'update' | 'delete' | 'bypass';
  motivo: string | null;
  payload_anterior: Record<string, unknown> | null;
  payload_novo: Record<string, unknown> | null;
  created_at: string;
}
