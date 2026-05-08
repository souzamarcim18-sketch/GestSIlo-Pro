import { z } from 'zod';

// ========== PERÍODOS PRESET & CUSTOM (SPEC) ==========

export const periodoPresetSchema = z.enum(['30d', '90d', '365d', 'safra', 'custom']);
export type PeriodoPreset = z.infer<typeof periodoPresetSchema>;

export const filtrosIndicadoresSchema = z
  .object({
    periodo: periodoPresetSchema,
    dataInicio: z.union([z.date(), z.string()]).optional(),
    dataFim: z.union([z.date(), z.string()]).optional(),
    lotes: z.array(z.string().uuid()).optional(),
    categorias: z.array(z.string()).optional(),
  })
  .strict() // RLS-First: rejeita campos desconhecidos (ex: fazenda_id)
  .refine(
    (data) => data.periodo !== 'custom' || (data.dataInicio && data.dataFim),
    { message: 'dataInicio e dataFim são obrigatórios se periodo = custom', path: ['dataInicio'] }
  )
  .refine(
    (data) => {
      if (!data.dataInicio || !data.dataFim) return true;
      const inicio = typeof data.dataInicio === 'string' ? new Date(data.dataInicio) : data.dataInicio;
      const fim = typeof data.dataFim === 'string' ? new Date(data.dataFim) : data.dataFim;
      return fim >= inicio;
    },
    { message: 'dataFim deve ser >= dataInicio', path: ['dataFim'] }
  );

export type FiltrosIndicadoresValidados = z.infer<typeof filtrosIndicadoresSchema>;

// ========== PERÍODO DE ANÁLISE (LEGADO) ==========

export const periodoAnaliseSchema = z
  .object({
    data_inicial: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar em formato ISO YYYY-MM-DD'),
    data_final: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar em formato ISO YYYY-MM-DD'),
  })
  .refine(
    (data) => new Date(data.data_final) >= new Date(data.data_inicial),
    {
      message: 'Data final deve ser igual ou posterior à data inicial',
      path: ['data_final'],
    }
  )
  .refine(
    (data) => {
      const diasDecorridos = Math.abs(
        (new Date(data.data_final).getTime() - new Date(data.data_inicial).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return diasDecorridos <= 5 * 365; // 5 anos
    },
    {
      message: 'Período máximo permitido é de 5 anos',
      path: ['data_final'],
    }
  );

export type PeriodoAnalise = z.infer<typeof periodoAnaliseSchema>;

// ========== OUTPUT DE TAXA (NUMERADOR / DENOMINADOR) ==========

export const indicadorTaxaSchema = z.object({
  numerador: z.number().nonnegative('Numerador deve ser ≥ 0'),
  denominador: z.number().nonnegative('Denominador deve ser ≥ 0'),
  taxa_percentual: z.number().nonnegative('Taxa percentual deve ser ≥ 0'),
});

export type IndicadorTaxa = z.infer<typeof indicadorTaxaSchema>;

// ========== OUTPUT DE GMD INDIVIDUAL ==========

export const indicadorGMDSchema = z.object({
  animal_id: z.string().uuid('animal_id deve ser um UUID válido'),
  peso_inicial: z.number().positive('Peso inicial deve ser > 0'),
  peso_final: z.number().positive('Peso final deve ser > 0'),
  data_inicial: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar em formato ISO YYYY-MM-DD'),
  data_final: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar em formato ISO YYYY-MM-DD'),
  dias: z.number().int('Dias deve ser um número inteiro').positive('Dias deve ser > 0'),
  ganho_total_kg: z.number('Ganho total deve ser um número (pode ser negativo)'),
  gmd_kg_dia: z.number('GMD deve ser um número (pode ser negativo)'),
});

export type IndicadorGMD = z.infer<typeof indicadorGMDSchema>;

// ========== OUTPUT DE COMPOSIÇÃO ==========

export const composicaoRebanhoSchema = z.object({
  total: z.number().int().nonnegative('Total deve ser ≥ 0'),
  por_categoria: z.record(z.string(), z.number().int().nonnegative('Valor por categoria deve ser ≥ 0')),
  por_sexo: z.object({
    machos: z.number().int().nonnegative('Machos deve ser ≥ 0'),
    femeas: z.number().int().nonnegative('Fêmeas deve ser ≥ 0'),
  }),
  por_vocacao: z.object({
    leiteiro: z.number().int().nonnegative('Leiteiro deve ser ≥ 0'),
    corte: z.number().int().nonnegative('Corte deve ser ≥ 0'),
  }),
});

export type ComposicaoRebanho = z.infer<typeof composicaoRebanhoSchema>;

// ========== GMD MÉDIO (CONSOLIDADO) ==========

export const gmdMedioSchema = z.object({
  gmd_medio: z.number().nullable(),
  animais_com_gmd: z.number().int().nonnegative('Animais com GMD deve ser ≥ 0'),
  animais_sem_dados: z.number().int().nonnegative('Animais sem dados deve ser ≥ 0'),
});

export type GMDMedio = z.infer<typeof gmdMedioSchema>;

// ========== RESPONSE CONSOLIDADA DA API ==========

export const respostaIndicadoresSchema = z.object({
  composicao: composicaoRebanhoSchema,
  taxa_natalidade: indicadorTaxaSchema,
  taxa_mortalidade: indicadorTaxaSchema,
  taxa_mortalidade_bezerros: indicadorTaxaSchema,
  taxa_desfrute: indicadorTaxaSchema,
  taxa_descarte: indicadorTaxaSchema,
  gmd_medio: gmdMedioSchema,
  periodo: periodoAnaliseSchema,
  gerado_em: z.string().datetime(),
});

export type RespostaIndicadores = z.infer<typeof respostaIndicadoresSchema>;
