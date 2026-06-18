/**
 * Schemas Zod para validação de Atividades de Campo
 * Alinhados com tipos em lib/types/talhoes.ts e CHECK constraints PostgreSQL
 */

import { z } from 'zod';
import { TipoOperacao, CategoriaPulverizacao } from '@/lib/types/talhoes';

// ========== ENUMS ZOD ==========

// Valores do enum TipoOperacao
const TIPOS_OPERACAO_VALUES = Object.values(TipoOperacao) as [string, ...string[]];

export const TipoOperacaoSchema = z.enum(TIPOS_OPERACAO_VALUES, {
  message: 'Tipo de operação deve ser um dos valores válidos',
});

// Categorias de Pulverização
const CATEGORIAS_PULVERIZACAO_VALUES = Object.values(CategoriaPulverizacao) as [string, ...string[]];

export const CategoriaPulverizacaoSchema = z.enum(CATEGORIAS_PULVERIZACAO_VALUES, {
  message: 'Categoria de pulverização deve ser um dos valores válidos',
});

// Unidades de dose
export const DoseUnidadeSchema = z.enum(['L/ha', 'kg/ha'], {
  message: 'Unidade de dose deve ser L/ha ou kg/ha',
});

// Método de entrada de análise de solo
export const MetodoEntradaSchema = z.enum(['Manual', 'Upload PDF'], {
  message: 'Método de entrada deve ser Manual ou Upload PDF',
});

/**
 * Campo numérico opcional tolerante a entradas vazias.
 *
 * React Hook Form com `valueAsNumber: true` converte um input vazio em `NaN`,
 * e `z.number()` rejeita `NaN` (mensagem "Expected number, received nan"),
 * bloqueando o submit como se o campo fosse obrigatório. Aqui normalizamos
 * `NaN` / `''` / `null` / `undefined` para `null` antes da validação.
 */
const optionalNumber = () =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? null : v),
    z.number().nullable(),
  );

// ========== SCHEMA PRINCIPAL ==========

export const AtividadeCampoSchema = z.object({
  tipo_operacao: TipoOperacaoSchema,
  data: z.string().min(1, 'Data é obrigatória'),
  maquina_id: z.string().uuid().optional().nullable(),
  horas_maquina: optionalNumber(),
  observacoes: z.string().optional().nullable(),
  custo_manual: optionalNumber(),

  // Preparo de Solo
  tipo_operacao_solo: z.string().optional().nullable(),

  // Calagem / Gessagem
  insumo_id: z.string().uuid().optional().nullable(),
  dose_ton_ha: optionalNumber(),

  // Plantio
  semente_id: z.string().uuid().optional().nullable(),
  populacao_plantas_ha: optionalNumber(),
  sacos_ha: optionalNumber(),
  espacamento_entre_linhas_cm: optionalNumber(),

  // Pulverização
  categoria_pulverizacao: CategoriaPulverizacaoSchema.optional().nullable(),
  dose_valor: optionalNumber(),
  dose_unidade: DoseUnidadeSchema.optional().nullable(),
  volume_calda_l_ha: optionalNumber(),

  // Colheita
  produtividade_ton_ha: optionalNumber(),
  maquina_colheita_id: z.string().uuid().optional().nullable(),
  horas_colheita: optionalNumber(),
  maquina_transporte_id: z.string().uuid().optional().nullable(),
  horas_transporte: optionalNumber(),
  maquina_compactacao_id: z.string().uuid().optional().nullable(),
  horas_compactacao: optionalNumber(),
  valor_terceirizacao_r: optionalNumber(),
  permite_rebrota: z.boolean().optional().nullable(),

  // Análise de Solo
  custo_amostra_r: optionalNumber(),
  metodo_entrada: MetodoEntradaSchema.optional().nullable(),
  url_pdf_analise: z.any().optional().nullable(),
  ph_cacl2: optionalNumber(),
  mo_g_dm3: optionalNumber(),
  p_mg_dm3: optionalNumber(),
  k_mmolc_dm3: optionalNumber(),
  ca_mmolc_dm3: optionalNumber(),
  mg_mmolc_dm3: optionalNumber(),
  al_mmolc_dm3: optionalNumber(),
  h_al_mmolc_dm3: optionalNumber(),
  s_mg_dm3: optionalNumber(),
  b_mg_dm3: optionalNumber(),
  cu_mg_dm3: optionalNumber(),
  fe_mg_dm3: optionalNumber(),
  mn_mg_dm3: optionalNumber(),
  zn_mg_dm3: optionalNumber(),

  // Irrigação
  lamina_mm: optionalNumber(),
  horas_irrigacao: optionalNumber(),
  custo_por_hora_r: optionalNumber(),

  colaborador_id: z.string().uuid().optional(),
});

export type AtividadeCampoInput = z.infer<typeof AtividadeCampoSchema>;
