// ─── Enums ────────────────────────────────────────────────────────────────────

export type FuncaoColaborador =
  | 'Vaqueiro'
  | 'Tratorista'
  | 'Auxiliar'
  | 'Gerente'
  | 'Outros';

export type VinculoColaborador =
  | 'CLT'
  | 'Diarista'
  | 'Empreiteiro'
  | 'Familiar';

export type TipoValorColaborador = 'diaria' | 'hora';

export type TipoAtividade =
  | 'Trato/alimentação do rebanho'
  | 'Ordenha'
  | 'Aplicação de defensivo'
  | 'Adubação'
  | 'Silagem (colheita/compactação/cobertura)'
  | 'Manutenção de cerca'
  | 'Manutenção de equipamento'
  | 'Limpeza de instalações'
  | 'Manejo sanitário'
  | 'Irrigação'
  | 'Roçagem'
  | 'Transporte interno'
  | 'Outros';

export type DuracaoTipo = 'horas' | 'dias';

// ─── Constantes ───────────────────────────────────────────────────────────────

export const HORAS_POR_DIA = 8;

export const FUNCOES_COLABORADOR: FuncaoColaborador[] = [
  'Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros',
];

export const VINCULOS_COLABORADOR: VinculoColaborador[] = [
  'CLT', 'Diarista', 'Empreiteiro', 'Familiar',
];

export const TIPOS_ATIVIDADE: TipoAtividade[] = [
  'Trato/alimentação do rebanho',
  'Ordenha',
  'Aplicação de defensivo',
  'Adubação',
  'Silagem (colheita/compactação/cobertura)',
  'Manutenção de cerca',
  'Manutenção de equipamento',
  'Limpeza de instalações',
  'Manejo sanitário',
  'Irrigação',
  'Roçagem',
  'Transporte interno',
  'Outros',
];

// ─── Entidades base ───────────────────────────────────────────────────────────

export interface Colaborador {
  id: string;
  fazenda_id: string;
  nome: string;
  funcao: FuncaoColaborador;
  vinculo: VinculoColaborador;
  tipo_valor: TipoValorColaborador;
  valor_ref: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// custo_final omitido: GENERATED ALWAYS AS — nunca em payload de INSERT/UPDATE.
export interface AtividadeMaoObra {
  id: string;
  fazenda_id: string;
  data: string;
  tipo_atividade: TipoAtividade;
  duracao_tipo: DuracaoTipo;
  duracao_valor: number;
  custo_calculado: number;
  custo_manual: number | null;
  custo_final: number;   // somente leitura — coluna gerada pelo banco
  talhao_id: string | null;
  silo_id: string | null;
  maquina_id: string | null;
  observacoes: string | null;
  despesa_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AtividadeMaoObraColaborador {
  id: string;
  fazenda_id: string;
  atividade_id: string;
  colaborador_id: string;
  custo_colaborador: number;
}

// ─── Tipos compostos ──────────────────────────────────────────────────────────

export interface ColaboradorResumido {
  id: string;
  nome: string;
  funcao: FuncaoColaborador;
  custo_colaborador: number;
}

export interface AtividadeComColaboradores extends AtividadeMaoObra {
  colaboradores: ColaboradorResumido[];
  talhao_nome: string | null;
  silo_nome: string | null;
  maquina_nome: string | null;
}

export interface ColaboradorComHistorico extends Colaborador {
  total_atividades: number;
  ultima_atividade: string | null;
  custo_mes_atual: number;
}

// ─── Payload para formulário multi-colaborador ────────────────────────────────

export interface ColaboradorSelecionado {
  colaborador_id: string;
  nome: string;
  tipo_valor: TipoValorColaborador;
  valor_ref: number;
  custo_calculado: number;  // preview client-side antes de salvar
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface KpisMaoObra {
  custo_total_mes: number;
  qtd_atividades_mes: number;
  colaborador_destaque: {
    nome: string;
    qtd_atividades: number;
  } | null;
  top3_tipos: Array<{
    tipo: TipoAtividade;
    custo_total: number;
  }>;
}

// ─── Payloads de INSERT (sem custo_final, sem fazenda_id, sem id) ─────────────

export type ColaboradorInsert = Omit<
  Colaborador,
  'id' | 'fazenda_id' | 'created_at' | 'updated_at'
>;

export type ColaboradorUpdate = Partial<
  Omit<Colaborador, 'id' | 'fazenda_id' | 'created_at' | 'updated_at'>
>;

// custo_final explicitamente omitido — é GENERATED ALWAYS AS no banco.
export type AtividadeInsert = Omit<
  AtividadeMaoObra,
  'id' | 'fazenda_id' | 'custo_final' | 'despesa_id' | 'created_at' | 'updated_at'
>;

export type AtividadeUpdate = Partial<
  Omit<
    AtividadeMaoObra,
    'id' | 'fazenda_id' | 'custo_final' | 'created_at' | 'updated_at'
  >
>;
