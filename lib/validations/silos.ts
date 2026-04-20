import { z } from 'zod';

// ========================================
// CONSTANTES
// ========================================

export const TIPOS_SILO = ['Superfície', 'Trincheira', 'Bag', 'Outros'] as const;
export const MOMENTOS_AVALIACAO = ['Fechamento', 'Abertura', 'Monitoramento'] as const;
export const SUBTIPOS_MOVIMENTACAO = [
  'Uso na alimentação',
  'Descarte',
  'Transferência',
  'Venda',
] as const;

// Faixas ideais por peneira — iguais para silos com e sem Kernel Processor
// A diferença de KP impacta apenas a interpretação do TMP (tamanho médio de partícula)
export const FAIXAS_PSPS: Record<string, { min: number; max: number }> = {
  peneira_19mm: { min: 3, max: 8 },
  peneira_8_19mm: { min: 45, max: 65 },
  peneira_4_8mm: { min: 20, max: 30 },
  peneira_fundo_4mm: { min: 0, max: 10 },
};

export const TMP_IDEAL_SEM_KP = { min: 8, max: 12 };
export const TMP_IDEAL_COM_KP = { min: 6, max: 10 };

// ========================================
// SCHEMAS ZOD
// ========================================

/**
 * Schema para criar/editar Silo.
 * Campos de data validados como YYYY-MM-DD (formato de <Input type="date">).
 */
export const siloSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  tipo: z.enum(TIPOS_SILO),
  talhao_id: z.string().uuid('ID do talhão inválido').nullable(),
  cultura_ensilada: z.string().max(100).nullable().optional(),
  data_fechamento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .nullable()
    .optional(),
  data_abertura_prevista: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .nullable()
    .optional(),
  data_abertura_real: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .nullable()
    .optional(),
  observacoes_gerais: z.string().max(1000).nullable().optional(),
  custo_aquisicao_rs_ton: z.number().min(0).nullable().optional(),
  volume_ensilado_ton_mv: z
    .number()
    .positive('Volume deve ser maior que 0')
    .nullable()
    .optional(),
  materia_seca_percent: z
    .number()
    .min(0, 'Matéria seca não pode ser negativa')
    .max(100, 'Matéria seca não pode exceder 100%')
    .nullable()
    .optional(),
  comprimento_m: z
    .union([z.number().positive('Comprimento deve ser maior que 0'), z.null()])
    .optional(),
  largura_m: z
    .union([z.number().positive('Largura deve ser maior que 0'), z.null()])
    .optional(),
  altura_m: z
    .union([z.number().positive('Altura deve ser maior que 0'), z.null()])
    .optional(),
  insumo_lona_id: z.string().uuid('ID da lona inválido').nullable().optional(),
  insumo_inoculante_id: z
    .string()
    .uuid('ID do inoculante inválido')
    .nullable()
    .optional(),
});

export type SiloInput = z.infer<typeof siloSchema>;

/**
 * Schema para registrar Movimentação de Silo.
 * - Subtipo obrigatório se tipo='Saída'
 * - Data no formato YYYY-MM-DD (obrigatório)
 */
export const movimentacaoSiloSchema = z
  .object({
    silo_id: z.string().uuid('ID do silo inválido'),
    tipo: z.enum(['Entrada', 'Saída']),
    subtipo: z.enum(SUBTIPOS_MOVIMENTACAO).nullable().optional(),
    quantidade: z.number().positive('Quantidade deve ser maior que 0'),
    data: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    talhao_id: z.string().uuid('ID do talhão inválido').nullable().optional(),
    responsavel: z.string().max(100).nullable().optional(),
    observacao: z.string().max(500).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.tipo === 'Saída') {
        return data.subtipo !== null && data.subtipo !== undefined;
      }
      return true;
    },
    {
      message: 'Subtipo é obrigatório para saídas',
      path: ['subtipo'],
    }
  );

export type MovimentacaoSiloInput = z.infer<typeof movimentacaoSiloSchema>;

/**
 * Schema para formulário de Avaliação Bromatológica.
 * Sem silo_id — será adicionado no submit.
 */
export const avaliacaoBromatologicaFormSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  momento: z.enum(MOMENTOS_AVALIACAO),
  ms: z.number().min(0, 'MS não pode ser negativa').max(100, 'MS não pode exceder 100%').nullable().optional(),
  pb: z.number().min(0, 'PB não pode ser negativa').max(100, 'PB não pode exceder 100%').nullable().optional(),
  fdn: z.number().min(0, 'FDN não pode ser negativa').max(100, 'FDN não pode exceder 100%').nullable().optional(),
  fda: z.number().min(0, 'FDA não pode ser negativa').max(100, 'FDA não pode exceder 100%').nullable().optional(),
  amido: z.number().min(0, 'Amido não pode ser negativo').max(100, 'Amido não pode exceder 100%').nullable().optional(),
  ndt: z.number().min(0, 'NDT não pode ser negativo').max(100, 'NDT não pode exceder 100%').nullable().optional(),
  ph: z
    .number()
    .min(0, 'pH não pode ser negativo')
    .max(14, 'pH não pode exceder 14')
    .nullable()
    .optional(),
  avaliador: z.string().max(100).nullable().optional(),
});

/**
 * Schema para criar Avaliação Bromatológica (com silo_id).
 */
export const avaliacaoBromatologicaSchema = avaliacaoBromatologicaFormSchema.extend({
  silo_id: z.string().uuid('ID do silo inválido'),
});

export type AvaliacaoBromatologicaInput = z.infer<typeof avaliacaoBromatologicaSchema>;

/**
 * Schema para formulário de Avaliação PSPS.
 * - Soma das 4 peneiras deve ser 100% (±0.5%)
 * - Sem silo_id — será adicionado no submit
 */
export const avaliacaoPspsFormSchema = z
  .object({
    data: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    momento: z.enum(MOMENTOS_AVALIACAO),
    peneira_19mm: z
      .number()
      .min(0, 'Peneira >19mm não pode ser negativa')
      .max(100, 'Peneira >19mm não pode exceder 100%'),
    peneira_8_19mm: z
      .number()
      .min(0, 'Peneira 8-19mm não pode ser negativa')
      .max(100, 'Peneira 8-19mm não pode exceder 100%'),
    peneira_4_8mm: z
      .number()
      .min(0, 'Peneira 4-8mm não pode ser negativa')
      .max(100, 'Peneira 4-8mm não pode exceder 100%'),
    peneira_fundo_4mm: z
      .number()
      .min(0, 'Fundo <4mm não pode ser negativo')
      .max(100, 'Fundo <4mm não pode exceder 100%'),
    tamanho_teorico_corte_mm: z
      .number()
      .positive('Tamanho teórico deve ser maior que 0')
      .nullable()
      .optional(),
    kernel_processor: z.boolean(),
    avaliador: z.string().max(100).nullable().optional(),
  })
  .refine(
    (data) => {
      const soma =
        data.peneira_19mm +
        data.peneira_8_19mm +
        data.peneira_4_8mm +
        data.peneira_fundo_4mm;
      return soma >= 99.5 && soma <= 100.5;
    },
    {
      message: 'Soma dos peneiras deve ser 100% (±0.5%)',
      path: ['peneira_fundo_4mm'],
    }
  );

/**
 * Schema para criar Avaliação PSPS (com silo_id).
 */
export const avaliacaoPspsSchema = avaliacaoPspsFormSchema.extend({
  silo_id: z.string().uuid('ID do silo inválido'),
});

export type AvaliacaoPspsInput = z.infer<typeof avaliacaoPspsSchema>;
