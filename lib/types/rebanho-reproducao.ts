// TODO: Remover tipos manuais após rodar npm run db:types (migrations de Fase 2 serão criadas)

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

// Tipos de Eventos Reprodutivos (serão extraídos da tabela eventos_rebanho após migrations)
export interface EventoCobertura {
  animal_id: string;
  tipo: 'cobertura';
  data_evento: string;
  tipo_cobertura: 'monta_natural' | 'ia_fresco' | 'ia_congelado' | 'transferencia_embriao' | 'coleta_embriao' | 'outro';
  reprodutor_id: string;
  observacoes?: string | null;
}

export interface EventoDiagnostico {
  animal_id: string;
  tipo: 'diagnostico_prenhez';
  data_evento: string;
  metodo: 'palpacao' | 'ultrassom' | 'dosagem_prog';
  resultado: 'positivo' | 'negativo' | 'inconclusivo';
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
    sexo: 'Macho' | 'Fêmea';
    peso_kg?: number | null;
    vivo: boolean;
  }>;
  observacoes?: string | null;
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
  motivo: 'infertilidade' | 'mastite_cronica' | 'idade' | 'problema_cascos' | 'comportamento_agressivo' | 'outro';
  observacoes?: string | null;
}

export type EventoReprodutivo =
  | EventoCobertura
  | EventoDiagnostico
  | EventoParto
  | EventoSecagem
  | EventoAborto
  | EventoDescarte;

export type TipoCoberturaEnum = 'monta_natural' | 'ia_fresco' | 'ia_congelado' | 'transferencia_embriao' | 'coleta_embriao' | 'outro';
export type MetodoDiagnosticoEnum = 'palpacao' | 'ultrassom' | 'dosagem_prog';
export type ResultadoDiagnosticoEnum = 'positivo' | 'negativo' | 'inconclusivo';
export type TipoPartoEnum = 'normal' | 'distocico' | 'cesariana';
export type MotivoDescarteEnum = 'infertilidade' | 'mastite_cronica' | 'idade' | 'problema_cascos' | 'comportamento_agressivo' | 'outro';
export type StatusReprodutivo = 'vazia' | 'inseminada' | 'prenha' | 'lactacao' | 'seca' | 'descartada';
export type TipoReprodutorEnum = 'touro' | 'semen_ia' | 'touro_teste';
