/**
 * types/insumos.ts
 *
 * Tipos TypeScript para o módulo de Insumos.
 * Auto-gerados a partir do banco via Supabase Studio ou manualmente definidos.
 */

export interface CategoriaInsumo {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
}

export interface TipoInsumo {
  id: string;
  categoria_id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
}

export interface Insumo {
  id: string;
  fazenda_id: string;
  nome: string;
  unidade: string;
  estoque_minimo: number;
  estoque_atual: number;
  categoria_id?: string;
  tipo_id?: string;
  custo_medio: number;
  fornecedor?: string;
  local_armazen?: string;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
  criado_por?: string;
  atualizado_em: string;
  atualizado_por?: string;
  // NPK (se categoria == Fertilizantes)
  teor_n_percent?: number;
  teor_p_percent?: number;
  teor_k_percent?: number;
}

export interface MovimentacaoInsumo {
  id: string;
  insumo_id: string;
  tipo: 'Entrada' | 'Saída' | 'Ajuste';
  quantidade: number;
  valor_unitario?: number;
  data: string; // YYYY-MM-DD
  tipo_saida?: 'USO_INTERNO' | 'TRANSFERENCIA' | 'VENDA' | 'DEVOLUCAO' | 'DESCARTE' | 'TROCA';
  destino_tipo?: 'talhao' | 'maquina' | 'silo';
  destino_id?: string;
  observacoes?: string;
  origem: 'manual' | 'talhao' | 'frota' | 'silo' | 'financeiro';
  sinal_ajuste?: 1 | -1; // +1 (ganho) ou -1 (perda) para Ajuste
  despesa_id?: string;
  criado_em: string;
  criado_por?: string;
  responsavel?: string; // Nome do operador
}

export interface MovimentacaoComNome extends MovimentacaoInsumo {
  insumo_nome: string;
  insumo_unidade: string;
}

export enum TipoSaidaEnum {
  USO_INTERNO = 'USO_INTERNO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  VENDA = 'VENDA',
  DEVOLUCAO = 'DEVOLUCAO',
  DESCARTE = 'DESCARTE',
  TROCA = 'TROCA',
}

export enum OrigemMovimentacao {
  MANUAL = 'manual',
  TALHAO = 'talhao',
  FROTA = 'frota',
  SILO = 'silo',
  FINANCEIRO = 'financeiro',
}

/**
 * Insumo com relacionamentos JOINados.
 * Usado em queries que trazem categoria e tipo normalized.
 */
export interface InsumoComRelacoes extends Insumo {
  categoria?: { id: string; nome: string };
  tipo?: { id: string; nome: string };
}

export interface ListInsumosFilter {
  categoria_id?: string;
  tipo_id?: string;
  local_armazen?: string;
  busca?: string; // busca por nome, fornecedor, local
  apenasCriticos?: boolean; // apenas estoque_atual < estoque_minimo
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}
