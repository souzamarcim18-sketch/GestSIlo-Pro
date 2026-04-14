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

// ========================================
// SCHEMAS ZODO
// ========================================

/**
 * Schema para criar/editar Silo
 * - talhao_id obrigatório para novos silos
 * - Para edição, pode ser atualizado
 */
export const siloSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  tipo: z.enum(TIPOS_SILO),
  talhao_id: z.string().uuid('ID do talhão inválido').nullable(),
  cultura_ensilada: z.string().max(100).nullable().optional(),
  data_fechamento: z.string().nullable().optional(),
  data_abertura_prevista: z.string().nullable().optional(),
  data_abertura_real: z.string().nullable().optional(),
  observacoes_gerais: z.string().max(500).nullable().optional(),
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
    .number()
    .positive('Comprimento deve ser maior que 0')
    .nullable()
    .optional(),
  largura_m: z
    .number()
    .positive('Largura deve ser maior que 0')
    .nullable()
    .optional(),
  altura_m: z
    .number()
    .positive('Altura deve ser maior que 0')
    .nullable()
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
 * Schema para registrar Movimentação de Silo
 * - Subtipo obrigatório se tipo='Saída'
 * - Quantidade deve ser positiva
 * - Quantidade não pode exceder estoque atual (validar em server)
 */
export const movimentacaoSiloSchema = z
  .object({
    silo_id: z.string().uuid('ID do silo inválido'),
    tipo: z.enum(['Entrada', 'Saída']),
    subtipo: z.enum(SUBTIPOS_MOVIMENTACAO).nullable().optional(),
    quantidade: z.number().positive('Quantidade deve ser maior que 0'),
    data: z.string(),
    talhao_id: z.string().uuid('ID do talhão inválido').nullable().optional(),
    responsavel: z.string().max(100).nullable().optional(),
    observacao: z.string().max(500).nullable().optional(),
  })
  .refine(
    (data) => {
      // Se tipo='Saída', subtipo é obrigatório
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
 * Schema para Avaliação Bromatológica
 * - Todos os campos são opcionais (usuário escolhe quais preencher)
 * - MS e pH aceita valores de 0 a 100+
 */
export const avaliacaoBromatologicaSchema = z.object({
  silo_id: z.string().uuid('ID do silo inválido'),
  data: z.string(),
  momento: z.enum(MOMENTOS_AVALIACAO),
  ms: z.number().min(0, 'MS não pode ser negativa').nullable().optional(),
  pb: z.number().min(0, 'PB não pode ser negativa').nullable().optional(),
  fdn: z.number().min(0, 'FDN não pode ser negativa').nullable().optional(),
  fda: z.number().min(0, 'FDA não pode ser negativa').nullable().optional(),
  ee: z.number().min(0, 'EE não pode ser negativa').nullable().optional(),
  mm: z.number().min(0, 'MM não pode ser negativa').nullable().optional(),
  amido: z.number().min(0, 'Amido não pode ser negativo').nullable().optional(),
  ndt: z.number().min(0, 'NDT não pode ser negativo').nullable().optional(),
  ph: z
    .number()
    .min(0, 'pH não pode ser negativo')
    .max(14, 'pH não pode exceder 14')
    .nullable()
    .optional(),
  avaliador: z.string().max(100).nullable().optional(),
});

export type AvaliacaoBromatologicaInput = z.infer<
  typeof avaliacaoBromatologicaSchema
>;

/**
 * Schema para Avaliação PSPS
 * - Validação: soma dos peneiras deve ser 100% ±0.5%
 * - Todos os peneiras são obrigatórios
 */
export const avaliacaoPspsSchema = z
  .object({
    silo_id: z.string().uuid('ID do silo inválido'),
    data: z.string(),
    momento: z.enum(MOMENTOS_AVALIACAO),
    peneira_19mm: z
      .number()
      .min(0, 'Peneira 19mm não pode ser negativa')
      .max(100, 'Peneira 19mm não pode exceder 100%'),
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
      .min(0, 'Peneira fundo 4mm não pode ser negativa')
      .max(100, 'Peneira fundo 4mm não pode exceder 100%'),
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
      // Validar que a soma está entre 99.5% e 100.5%
      return soma >= 99.5 && soma <= 100.5;
    },
    {
      message: 'Soma dos peneiras deve ser 100% (±0.5%)',
      path: ['peneira_fundo_4mm'], // Erro será mostrado neste campo
    }
  );

export type AvaliacaoPspsInput = z.infer<typeof avaliacaoPspsSchema>;
