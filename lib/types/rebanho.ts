/**
 * Tipos TypeScript para o módulo de Rebanho
 * Baseado em: SPEC-rebanho.md (2026-04-30)
 */

// ========== ENUMS ==========

export enum TipoRebanho {
  LEITEIRO = 'leiteiro',
  CORTE = 'corte',
}

export enum StatusAnimal {
  ATIVO = 'Ativo',
  MORTO = 'Morto',
  VENDIDO = 'Vendido',
}

export enum TipoEvento {
  NASCIMENTO = 'nascimento',
  PESAGEM = 'pesagem',
  MORTE = 'morte',
  VENDA = 'venda',
  TRANSFERENCIA_LOTE = 'transferencia_lote',
}

// ========== INTERFACES PRINCIPAIS ==========

export interface Animal {
  id: string;
  fazenda_id: string;
  brinco: string;
  sexo: 'Macho' | 'Fêmea';
  tipo_rebanho: TipoRebanho;
  data_nascimento: string; // ISO date
  categoria: string;
  status: StatusAnimal;
  lote_id: string | null;
  peso_atual: number | null;
  mae_id: string | null;
  pai_id: string | null;
  raca: string | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lote {
  id: string;
  fazenda_id: string;
  nome: string;
  descricao: string | null;
  data_criacao: string;
  created_at: string;
  updated_at: string;
}

export interface EventoRebanho {
  id: string;
  fazenda_id: string;
  animal_id: string;
  tipo: TipoEvento;
  data_evento: string; // ISO date
  peso_kg: number | null;
  lote_id_destino: string | null; // Obrigatório se tipo = transferencia_lote
  comprador: string | null; // Opcional em venda
  valor_venda: number | null; // Opcional em venda
  observacoes: string | null;
  usuario_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PesoAnimal {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_pesagem: string; // ISO date
  peso_kg: number;
  observacoes: string | null;
  created_at: string;
}

// ========== PAYLOADS DISCRIMINADOS POR TIPO DE EVENTO ==========

export type EventoPayloadBase = {
  animal_id: string;
  data_evento: string;
  observacoes?: string;
};

export type EventoNascimentoPayload = EventoPayloadBase & {
  tipo: TipoEvento.NASCIMENTO;
};

export type EventoPesagemPayload = EventoPayloadBase & {
  tipo: TipoEvento.PESAGEM;
  peso_kg: number;
};

export type EventoMortePayload = EventoPayloadBase & {
  tipo: TipoEvento.MORTE;
};

export type EventoVendaPayload = EventoPayloadBase & {
  tipo: TipoEvento.VENDA;
  comprador?: string; // Opcional
  valor_venda?: number; // Opcional
};

export type EventoTransferenciaLotePayload = EventoPayloadBase & {
  tipo: TipoEvento.TRANSFERENCIA_LOTE;
  lote_id_destino: string; // Obrigatório
};

export type EventoPayload =
  | EventoNascimentoPayload
  | EventoPesagemPayload
  | EventoMortePayload
  | EventoVendaPayload
  | EventoTransferenciaLotePayload;

// ========== INPUTS PARA CRIAÇÃO/EDIÇÃO ==========

export type AnimalInput = Omit<
  Animal,
  'id' | 'fazenda_id' | 'categoria' | 'peso_atual' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type LoteInput = Omit<Lote, 'id' | 'fazenda_id' | 'data_criacao' | 'created_at' | 'updated_at'>;

export type EventoRebanhoInput = Omit<EventoRebanho, 'id' | 'fazenda_id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  usuario_id?: string; // opcional na UI, preenchido no servidor
};

export type PesoAnimalInput = Omit<PesoAnimal, 'id' | 'fazenda_id' | 'created_at'>;

// ========== CSV ROW ==========

export interface AnimalCSVRow {
  brinco: string;
  sexo: 'Macho' | 'Fêmea';
  data_nascimento: string; // ISO date ou DD/MM/YYYY
  tipo_rebanho?: 'leiteiro' | 'corte';
  lote?: string; // nome do lote (será criado se não existir)
  raca?: string;
  observacoes?: string;
}

// ========== VALIDAÇÃO CSV ==========

export interface AnimalCSVValidationResult {
  linha: number;
  brinco: string;
  status: 'sucesso' | 'erro';
  mensagem?: string;
}

export interface CSVImportResult {
  total_linhas: number;
  importados: number;
  erros: AnimalCSVValidationResult[];
  lote_criado_id?: string;
  lote_criado_nome?: string;
}

// ========== OFFLINE SYNC ==========

export interface EventoRebanhoSyncQueue {
  id: string;
  payload: EventoPayload;
  usuario_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro';
  tentativas: number;
  erro_mensagem?: string;
  criado_em: number; // timestamp ms
  enviado_em?: number;
}

// ========== PROJEÇÃO DE REBANHO (FASE 3) ==========

export interface CategoriaProjetada {
  id: string;
  nome: string;
  quantidade_atual: number;
  quantidade_projetada: number;
  variacao: number;
  alteracoes?: {
    partos_novos?: number;
    mudancas_categoria?: number;
    descartes?: number;
  };
}

export interface RebanhoSnapshot {
  data_calculo: string; // ISO 8601
  data_projecao: string; // ISO 8601
  composicao: Record<string, number>;
  total_cabecas: number;
  total_animais_base: number;
  partos_inclusos_na_projecao: number;
  mudancas_categoria_inclusos: number;
  descartes_inclusos: number;
  tipo_rebanho: 'Leite' | 'Corte';
  modo: 'PROJETADO' | 'MANUAL';
  usuario_editou: boolean;
  avisos?: string[];
  versao_algoritmo: string;
}

export interface RebanhoProjetado {
  data_alvo: Date;
  data_calculo: Date;
  categorias: CategoriaProjetada[];
  composicao: Record<string, number>;
  total_cabecas: number;
  fatores_aplicados: {
    partos_confirmados: number;
    mudancas_categoria: number;
    descartes: number;
    avisos: string[];
  };
  toSnapshot(): RebanhoSnapshot;
}

export interface DeteccaoRebanho {
  rebanho_detectado: boolean;
  data_ultimo_animal?: Date;
  razao?: 'vazio' | 'sem_acesso' | 'nenhum';
}
