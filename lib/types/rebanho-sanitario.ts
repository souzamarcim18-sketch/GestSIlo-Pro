// Tipos para o módulo de Sanidade Animal

export type TipoEventoSanitario =
  | 'vacinacao'
  | 'vermifugacao'
  | 'tratamento_veterinario'
  | 'exame_laboratorial';

export type ViaAplicacao =
  | 'subcutanea'
  | 'intramuscular'
  | 'intranasal'
  | 'oral'
  | 'topica';

export type ResultadoTratamento =
  | 'cura'
  | 'melhora'
  | 'sem_resposta'
  | 'obito'
  | 'em_tratamento';

// Base comum
interface EventoSanitarioBase {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_evento: string; // ISO date
  responsavel: string | null;
  observacoes: string | null;
  usuario_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Discriminated union por tipo
export interface EventoVacinacao extends EventoSanitarioBase {
  tipo: 'vacinacao';
  vacina_nome: string;
  dose: string;
  via_aplicacao: ViaAplicacao;
  lote_produto: string | null;
  data_proxima_dose: string | null; // ISO date
}

export interface EventoVermifugacao extends EventoSanitarioBase {
  tipo: 'vermifugacao';
  vacina_nome: string; // nome do vermífugo
  via_aplicacao: ViaAplicacao;
  lote_produto: string | null;
  data_proxima_dose: string | null;
}

export interface EventoTratamentoVeterinario extends EventoSanitarioBase {
  tipo: 'tratamento_veterinario';
  diagnostico: string;
  medicamento: string;
  duracao_dias: number | null;
  resultado: ResultadoTratamento | null;
}

export interface EventoExameLaboratorial extends EventoSanitarioBase {
  tipo: 'exame_laboratorial';
  tipo_exame: string; // Ex: "Brucelose", "Tuberculose"
  resultado: string | null;
  numero_protocolo: string | null;
}

export type EventoSanitario =
  | EventoVacinacao
  | EventoVermifugacao
  | EventoTratamentoVeterinario
  | EventoExameLaboratorial;

// Raw DB row (antes de discriminar)
export interface EventoSanitarioRow extends EventoSanitarioBase {
  tipo: TipoEventoSanitario;
  vacina_nome: string | null;
  dose: string | null;
  via_aplicacao: ViaAplicacao | null;
  lote_produto: string | null;
  data_proxima_dose: string | null;
  diagnostico: string | null;
  medicamento: string | null;
  duracao_dias: number | null;
  resultado: ResultadoTratamento | string | null;
  tipo_exame: string | null;
  numero_protocolo: string | null;
}

export type EventoSanitarioInput = Omit<
  EventoSanitarioRow,
  'id' | 'fazenda_id' | 'deleted_at' | 'created_at' | 'updated_at'
>;

// Alerta sanitário (para dashboard)
export interface AlertaSanitario {
  animal_id: string;
  animal_brinco: string;
  animal_nome: string | null;
  tipo: TipoEventoSanitario;
  vacina_nome: string;
  data_proxima_dose: string;
  dias_para_vencimento: number; // negativo = vencido
}
