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

// ========== SCHEMA PRINCIPAL ==========

export const AtividadeCampoSchema = z.object({
  tipo_operacao: TipoOperacaoSchema,
  data: z.string().min(1, 'Data é obrigatória'),
  maquina_id: z.string().uuid().optional().nullable(),
  horas_maquina: z.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  custo_manual: z.number().optional().nullable(),

  // Preparo de Solo
  tipo_operacao_solo: z.string().optional().nullable(),

  // Calagem / Gessagem
  insumo_id: z.string().uuid().optional().nullable(),
  dose_ton_ha: z.number().optional().nullable(),

  // Plantio
  semente_id: z.string().uuid().optional().nullable(),
  populacao_plantas_ha: z.number().optional().nullable(),
  sacos_ha: z.number().optional().nullable(),
  espacamento_entre_linhas_cm: z.number().optional().nullable(),

  // Pulverização
  categoria_pulverizacao: CategoriaPulverizacaoSchema.optional().nullable(),
  dose_valor: z.number().optional().nullable(),
  dose_unidade: DoseUnidadeSchema.optional().nullable(),
  volume_calda_l_ha: z.number().optional().nullable(),

  // Colheita
  produtividade_ton_ha: z.number().optional().nullable(),
  maquina_colheita_id: z.string().uuid().optional().nullable(),
  horas_colheita: z.number().optional().nullable(),
  maquina_transporte_id: z.string().uuid().optional().nullable(),
  horas_transporte: z.number().optional().nullable(),
  maquina_compactacao_id: z.string().uuid().optional().nullable(),
  horas_compactacao: z.number().optional().nullable(),
  valor_terceirizacao_r: z.number().optional().nullable(),
  permite_rebrota: z.boolean().optional().nullable(),

  // Análise de Solo
  custo_amostra_r: z.number().optional().nullable(),
  metodo_entrada: MetodoEntradaSchema.optional().nullable(),
  url_pdf_analise: z.any().optional().nullable(),
  ph_cacl2: z.number().optional().nullable(),
  mo_g_dm3: z.number().optional().nullable(),
  p_mg_dm3: z.number().optional().nullable(),
  k_mmolc_dm3: z.number().optional().nullable(),
  ca_mmolc_dm3: z.number().optional().nullable(),
  mg_mmolc_dm3: z.number().optional().nullable(),
  al_mmolc_dm3: z.number().optional().nullable(),
  h_al_mmolc_dm3: z.number().optional().nullable(),
  s_mg_dm3: z.number().optional().nullable(),
  b_mg_dm3: z.number().optional().nullable(),
  cu_mg_dm3: z.number().optional().nullable(),
  fe_mg_dm3: z.number().optional().nullable(),
  mn_mg_dm3: z.number().optional().nullable(),
  zn_mg_dm3: z.number().optional().nullable(),

  // Irrigação
  lamina_mm: z.number().optional().nullable(),
  horas_irrigacao: z.number().optional().nullable(),
  custo_por_hora_r: z.number().optional().nullable(),
});

export type AtividadeCampoInput = z.infer<typeof AtividadeCampoSchema>;
