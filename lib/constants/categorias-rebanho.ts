/**
 * Fonte ÚNICA das strings de categoria de animal (Fase 0 — SPEC-rebanho012, P0.2).
 *
 * REGRA INVIOLÁVEL: estas strings DEVEM ser exatamente as que o trigger SQL
 * `recalcular_categoria_animal` grava em `animais.categoria`. O banco é a verdade;
 * este arquivo apenas o espelha. NÃO alterar uma string aqui sem antes alterar o
 * trigger e migrar os dados (fora do escopo desta SPEC).
 *
 * Trigger canônico: supabase/migrations/20260505_fix_categoria_bezerro_por_sexo.sql
 * (última migration a (re)definir a função; nenhuma posterior a redefine).
 *
 * Consumidores diretos desta fonte:
 * - lib/types/rebanho.ts        → CATEGORIAS_POR_TIPO (dropdowns de cadastro/edição)
 * - lib/calculos/indicadores-rebanho.ts → grupos CATEGORIAS_* (cálculos zootécnicos)
 */

// ========== STRINGS CANÔNICAS (espelham o trigger) ==========

export const CATEGORIA = {
  BEZERRO: 'Bezerro',
  BEZERRA: 'Bezerra',
  NOVILHA: 'Novilha',
  NOVILHA_PRENHA: 'Novilha Prenha',
  NOVILHO: 'Novilho',
  VACA_LACTACAO: 'Vaca em Lactação',
  VACA_SECA: 'Vaca Seca',
  VACA_PRENHA: 'Vaca Prenha',
  VACA_VAZIA: 'Vaca Vazia',
  VACA_MATRIZ: 'Vaca Matriz',
  TOURO: 'Touro',
  BOI: 'Boi',
  BOI_DESCARTADO: 'Boi Descartado',
  FEMEA_DESCARTADA: 'Fêmea Descartada',
} as const;

export type CategoriaRebanho = (typeof CATEGORIA)[keyof typeof CATEGORIA];

// ========== AGRUPAMENTOS POR TIPO DE REBANHO (dropdowns de cadastro) ==========

const CATEGORIAS_LEITEIRO: readonly string[] = [
  CATEGORIA.BEZERRO,
  CATEGORIA.BEZERRA,
  CATEGORIA.NOVILHA,
  CATEGORIA.NOVILHA_PRENHA,
  CATEGORIA.NOVILHO,
  CATEGORIA.VACA_LACTACAO,
  CATEGORIA.VACA_SECA,
  CATEGORIA.VACA_PRENHA,
  CATEGORIA.VACA_VAZIA,
  CATEGORIA.TOURO,
];

const CATEGORIAS_CORTE: readonly string[] = [
  CATEGORIA.BEZERRO,
  CATEGORIA.BEZERRA,
  CATEGORIA.NOVILHA,
  CATEGORIA.NOVILHO,
  CATEGORIA.VACA_MATRIZ,
  CATEGORIA.BOI,
  CATEGORIA.BOI_DESCARTADO,
  CATEGORIA.FEMEA_DESCARTADA,
  CATEGORIA.TOURO,
];

export const CATEGORIAS_POR_TIPO_REBANHO: Record<string, readonly string[]> = {
  leiteiro: CATEGORIAS_LEITEIRO,
  corte: CATEGORIAS_CORTE,
  dupla_aptidao: CATEGORIAS_LEITEIRO,
};

// ========== GRUPOS PARA CÁLCULOS ZOOTÉCNICOS ==========

export const GRUPO_BEZERROS = [CATEGORIA.BEZERRO, CATEGORIA.BEZERRA] as const;
export const GRUPO_NOVILHAS = [CATEGORIA.NOVILHA, CATEGORIA.NOVILHA_PRENHA] as const;
export const GRUPO_NOVILHOS = [CATEGORIA.NOVILHO] as const;
export const GRUPO_VACAS_LEITEIRAS = [
  CATEGORIA.VACA_LACTACAO,
  CATEGORIA.VACA_SECA,
  CATEGORIA.VACA_PRENHA,
  CATEGORIA.VACA_VAZIA,
] as const;
export const GRUPO_VACAS_CORTE = [CATEGORIA.VACA_MATRIZ] as const;
export const GRUPO_TOURO = [CATEGORIA.TOURO] as const;
export const GRUPO_BOI = [CATEGORIA.BOI, CATEGORIA.BOI_DESCARTADO] as const;
export const GRUPO_DESCARTE = [CATEGORIA.BOI_DESCARTADO, CATEGORIA.FEMEA_DESCARTADA] as const;
