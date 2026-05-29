import type { Database } from '@/types/supabase';

export type TipoEventoRebanho =
  Database['public']['Enums']['tipo_evento_rebanho'];

// Tipos suportados no lote (exclui nascimento, morte, venda, parto)
export const TIPOS_EVENTO_LOTE = [
  'pesagem',
  'cobertura',
  'diagnostico_prenhez',
  'transferencia_lote',
  'secagem',
  'aborto',
  'descarte',
  'desmame',
  'aspiracao_opu',
  'protocolo_hormonal',
  'transferencia_embriao',
] as const satisfies ReadonlyArray<TipoEventoRebanho>;

export type TipoEventoLote = (typeof TIPOS_EVENTO_LOTE)[number];

export const LABEL_TIPO_EVENTO: Record<TipoEventoLote, string> = {
  pesagem: 'Pesagem',
  cobertura: 'Cobertura',
  diagnostico_prenhez: 'Diagnóstico de Prenhez',
  transferencia_lote: 'Transferência de Lote',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
  desmame: 'Desmame',
  aspiracao_opu: 'Aspiração / OPU',
  protocolo_hormonal: 'Protocolo Hormonal',
  transferencia_embriao: 'Transferência de Embrião',
};

// Animal como aparece nas listas do wizard
export interface AnimalParaLote {
  id: string;
  brinco: string;
  nome: string | null;
  sexo: 'Macho' | 'Fêmea';
  categoria: string;
  lote_id: string | null;
  lote_nome: string | null;
  peso_atual: number | null;
}

// Estado interno do wizard
export type WizardStep = 1 | 2 | 3;

export interface WizardState {
  step: WizardStep;
  tipo: TipoEventoLote | null;
  dadosCompartilhados: Record<string, unknown>;
  animaisSelecionados: AnimalParaLote[];
  dadosIndividuais: Record<string, Record<string, unknown>>;
}

// Retorno da Server Action
export interface ResultadoLote {
  inseridos: number;
  erros: Array<{ animal_id: string; brinco: string; motivo: string }>;
}
