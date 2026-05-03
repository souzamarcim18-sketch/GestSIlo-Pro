/**
 * Tipos TypeScript para Fase 2 — Reprodução
 * Baseado em: PRD v1.1 (Fase 2), Spec v1.2
 */

// ========== ENUMS ==========

export enum TipoCobertura {
  MONTA_NATURAL = 'monta_natural',
  IA_CONVENCIONAL = 'ia_convencional',
  IATF = 'iatf',
  TETF = 'tetf',
  FIV = 'fiv',
  REPASSE = 'repasse',
}

export enum MetodoDiagnostico {
  PALPACAO = 'palpacao',
  ULTRASSOM = 'ultrassom',
  SANGUE = 'sangue',
}

export enum ResultadoPrenhez {
  POSITIVO = 'positivo',
  NEGATIVO = 'negativo',
  DUVIDOSO = 'duvidoso',
}

export enum TipoParto {
  NORMAL = 'normal',
  DISTOCICO = 'distocico',
  CESARIANA = 'cesariana',
}

export enum MotivoDescarte {
  IDADE = 'idade',
  REPRODUTIVO = 'reprodutivo',
  SANITARIO = 'sanitario',
  PRODUCAO = 'producao',
  APRUMOS = 'aprumos',
  OUTRO = 'outro',
}

export enum StatusReprodutivo {
  VAZIA = 'vazia',
  INSEMINADA = 'inseminada',
  PRENHA = 'prenha',
  LACTACAO = 'lactacao',
  SECA = 'seca',
  DESCARTADA = 'descartada',
}

// ========== INTERFACES PRINCIPAIS ==========

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

export interface EventoPartoCria {
  sexo: 'Macho' | 'Fêmea';
  peso_kg: number | null;
  vivo: boolean;
}

// ========== EVENTOS REPRODUTIVOS ==========

export type EventoCobertura = {
  animal_id: string;
  tipo: 'cobertura';
  data_evento: string;
  tipo_cobertura: string;
  reprodutor_id?: string | null;
  observacoes?: string;
};

export type EventoDiagnostico = {
  animal_id: string;
  tipo: 'diagnostico_prenhez';
  data_evento: string;
  metodo_diagnostico: string;
  resultado_prenhez: string;
  idade_gestacional_dias?: number | null;
  observacoes?: string;
};

export type EventoParto = {
  animal_id: string;
  tipo: 'parto';
  data_evento: string;
  tipo_parto: string;
  gemelar?: boolean;
  natimorto?: boolean;
  crias?: EventoPartoCria[];
  observacoes?: string;
};

export type EventoSecagem = {
  animal_id: string;
  tipo: 'secagem';
  data_evento: string;
  observacoes?: string;
};

export type EventoAborto = {
  animal_id: string;
  tipo: 'aborto';
  data_evento: string;
  idade_gestacional_dias?: number | null;
  causa_aborto?: string;
  observacoes?: string;
};

export type EventoDescarte = {
  animal_id: string;
  tipo: 'descarte';
  data_evento: string;
  motivo_descarte: string;
  observacoes?: string;
};

export type EventoReprodutivo =
  | EventoCobertura
  | EventoDiagnostico
  | EventoParto
  | EventoSecagem
  | EventoAborto
  | EventoDescarte;

// ========== INDICADORES ==========

export interface IndicadoresReprodutivos {
  taxa_prenhez_pct: number;
  psm_dias_media: number;
  iep_dias_media: number;
  contagem_por_status: {
    vazia: number;
    inseminada: number;
    prenha: number;
    lactacao: number;
    seca: number;
    descartada: number;
  };
  animais_repetidoras: number;
}

// ========== OFFLINE SYNC (extensão Fase 1) ==========

export interface EventoReprodutivoSyncQueue {
  id: string;
  payload: EventoReprodutivo;
  usuario_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro' | 'pendente_revisao';
  tentativas: number;
  erro_mensagem?: string;
  motivo_revisao?: string;
  criado_em: number;
  enviado_em?: number;
}
