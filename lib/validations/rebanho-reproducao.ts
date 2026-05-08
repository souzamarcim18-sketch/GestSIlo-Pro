import { z } from 'zod';

// ========== REPRODUTOR ==========

export const criarReprodutorSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Máximo 255 caracteres'),
  tipo: z.enum(['touro', 'semen_ia', 'touro_teste'], {
    message: 'Tipo de reprodutor inválido'
  }),
  raca: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .nullable(),
  numero_registro: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .nullable(),
  data_entrada: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data de entrada deve ser válida e não futura')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .optional()
    .nullable(),
});

export const editarReprodutorSchema = criarReprodutorSchema.omit({});

export type CriarReprodutorInput = z.infer<typeof criarReprodutorSchema>;
export type EditarReprodutorInput = z.infer<typeof editarReprodutorSchema>;

// ========== COBERTURA ==========

export const criarCoberturaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal('cobertura'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  // Bate com CHECK em eventos_rebanho.tipo_cobertura
  tipo_cobertura: z.enum(['monta_natural', 'ia_convencional', 'iatf', 'tetf', 'fiv', 'repasse'], {
    message: 'Tipo de cobertura inválido'
  }),
  reprodutor_id: z.string().min(1, 'Reprodutor obrigatório').uuid('Reprodutor inválido'),
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
});

export type CriarCoberturaInput = z.infer<typeof criarCoberturaSchema>;

// ========== DIAGNÓSTICO ==========

export const criarDiagnosticoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal('diagnostico_prenhez'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  // Bate com CHECK em eventos_rebanho.metodo_diagnostico
  metodo_diagnostico: z.enum(['palpacao', 'ultrassom', 'sangue'], {
    message: 'Método de diagnóstico inválido'
  }),
  // Bate com CHECK em eventos_rebanho.resultado_prenhez (trigger usa 'duvidoso')
  resultado_prenhez: z.enum(['positivo', 'negativo', 'duvidoso'], {
    message: 'Resultado inválido'
  }),
  idade_gestacional_dias: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser >= 0')
    .max(300, 'Deve ser <= 300')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
});

export type CriarDiagnosticoInput = z.infer<typeof criarDiagnosticoSchema>;

// ========== PARTO ==========

export const criarPartoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal('parto'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  tipo_parto: z.enum(['normal', 'distocico', 'cesariana'], {
    message: 'Tipo de parto inválido'
  }),
  gemelar: z.boolean(),
  natimorto: z.boolean(),
  crias: z
    .array(
      z.object({
        sexo: z.enum(['Macho', 'Fêmea'], {
          message: 'Sexo da cria inválido'
        }),
        peso_kg: z
          .number()
          .min(0.1, 'Peso deve ser > 0')
          .optional()
          .nullable(),
        vivo: z.boolean(),
      })
    )
    .min(1, 'Mínimo 1 cria')
    .max(2, 'Máximo 2 crias'),
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
  // Obrigatório se não há prenhez confirmada (bypass de admin)
  bypass_justificativa: z
    .string()
    .min(10, 'Justificativa deve ter no mínimo 10 caracteres')
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.gemelar && data.crias.length !== 2) {
      return false;
    }
    if (!data.gemelar && data.crias.length !== 1) {
      return false;
    }
    return true;
  },
  {
    message: 'Gemelar deve ter exatamente 2 crias, não-gemelar deve ter exatamente 1',
    path: ['crias'],
  }
);

export type CriarPartoInput = z.infer<typeof criarPartoSchema>;

// ========== SECAGEM ==========

export const criarSecagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal('secagem'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
});

export type CriarSecagemInput = z.infer<typeof criarSecagemSchema>;

// ========== ABORTO ==========

export const criarAbortoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal('aborto'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  idade_gestacional_dias: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser >= 0')
    .max(300, 'Deve ser <= 300')
    .optional()
    .nullable(),
  causa_aborto: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
});

export type CriarAbortoInput = z.infer<typeof criarAbortoSchema>;

// ========== DESCARTE ==========

export const criarDescarteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal('descarte'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  // Bate com CHECK em eventos_rebanho.motivo_descarte
  motivo_descarte: z.enum(['idade', 'reprodutivo', 'sanitario', 'producao', 'aprumos', 'outro'], {
    message: 'Motivo de descarte inválido'
  }),
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .nullable(),
});

export type CriarDescarteInput = z.infer<typeof criarDescarteSchema>;

// ========== PARÂMETROS REPRODUTIVOS ==========

// Bate com tabela parametros_reprodutivos_fazenda (Seção 1.5)
export const atualizarParametrosReprodutivosSchema = z.object({
  dias_gestacao: z
    .number()
    .int('Deve ser um número inteiro')
    .min(270, 'Deve ser >= 270')
    .max(295, 'Deve ser <= 295')
    .optional(),
  dias_seca: z
    .number()
    .int('Deve ser um número inteiro')
    .min(30, 'Deve ser >= 30')
    .max(90, 'Deve ser <= 90')
    .optional(),
  pve_dias: z
    .number()
    .int('Deve ser um número inteiro')
    .min(30, 'Deve ser >= 30')
    .max(120, 'Deve ser <= 120')
    .optional(),
  coberturas_para_repetidora: z
    .number()
    .int('Deve ser um número inteiro')
    .min(2, 'Deve ser >= 2')
    .max(5, 'Deve ser <= 5')
    .optional(),
  janela_repetidora_dias: z
    .number()
    .int('Deve ser um número inteiro')
    .min(90, 'Deve ser >= 90')
    .max(365, 'Deve ser <= 365')
    .optional(),
  meta_taxa_prenhez_pct: z
    .number()
    .int('Deve ser um número inteiro')
    .min(50, 'Deve ser >= 50')
    .max(100, 'Deve ser <= 100')
    .optional(),
  meta_psm_dias: z
    .number()
    .int('Deve ser um número inteiro')
    .min(50, 'Deve ser >= 50')
    .max(120, 'Deve ser <= 120')
    .optional(),
  meta_iep_dias: z
    .number()
    .int('Deve ser um número inteiro')
    .min(350, 'Deve ser >= 350')
    .max(450, 'Deve ser <= 450')
    .optional(),
});

export type AtualizarParametrosReprodutivosInput = z.infer<typeof atualizarParametrosReprodutivosSchema>;
