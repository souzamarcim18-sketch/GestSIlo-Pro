import { z } from 'zod';

// ========== COBERTURA ==========

export const criarCoberturaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo_cobertura: z.enum(['monta_natural', 'ia_convencional', 'iatf', 'tetf', 'fiv', 'repasse']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  reprodutor_id: z.string().uuid('Reprodutor inválido').nullable().optional(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarCoberturaInput = z.infer<typeof criarCoberturaSchema>;

// ========== DIAGNÓSTICO ==========

export const criarDiagnosticoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  metodo_diagnostico: z.enum(['palpacao', 'ultrassom', 'sangue']),
  resultado_prenhez: z.enum(['positivo', 'negativo', 'duvidoso']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  idade_gestacional_dias: z
    .number()
    .int('Deve ser número inteiro')
    .min(0, 'Mínimo 0')
    .max(300, 'Idade gestacional máxima é 300 dias')
    .optional()
    .nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarDiagnosticoInput = z.infer<typeof criarDiagnosticoSchema>;

// ========== PARTO ==========

export const criarPartoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo_parto: z.enum(['normal', 'distocico', 'cesariana']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  gemelar: z.boolean().default(false),
  natimorto: z.boolean().default(false),
  crias: z
    .array(
      z.object({
        sexo: z.enum(['Macho', 'Fêmea']),
        peso_kg: z.number().positive('Deve ser maior que zero').optional().nullable(),
        vivo: z.boolean().default(true),
      })
    )
    .min(1, 'Mínimo 1 cria')
    .max(2, 'Máximo 2 crias'),
  observacoes: z.string().max(500).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.gemelar && data.crias.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Parto gemelar deve ter exatamente 2 crias'
    });
  }
  if (!data.gemelar && data.crias.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Parto simples deve ter exatamente 1 cria'
    });
  }
});

export type CriarPartoInput = z.infer<typeof criarPartoSchema>;

// ========== SECAGEM ==========

export const criarSecagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarSecagemInput = z.infer<typeof criarSecagemSchema>;

// ========== ABORTO ==========

export const criarAbortoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  idade_gestacional_dias: z.number().int('Deve ser número inteiro').min(0, 'Mínimo 0').max(300, 'Idade gestacional máxima é 300 dias').optional().nullable(),
  causa_aborto: z.string().max(500).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarAbortoInput = z.infer<typeof criarAbortoSchema>;

// ========== DESCARTE ==========

export const criarDescarteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  motivo_descarte: z.enum(['idade', 'reprodutivo', 'sanitario', 'producao', 'aprumos', 'outro']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarDescarteInput = z.infer<typeof criarDescarteSchema>;

// ========== REPRODUTOR ==========

export const criarReprodutorSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  tipo: z.enum(['touro', 'semen_ia', 'touro_teste']),
  raca: z.string().max(255).optional().nullable(),
  numero_registro: z.string().max(255).optional().nullable(),
  data_entrada: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data deve ser válida e não futura')
    .optional()
    .nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarReprodutorInput = z.infer<typeof criarReprodutorSchema>;

// ========== PARÂMETROS REPRODUTIVOS ==========

export const atualizarParametrosReprodutivosSchema = z.object({
  dias_gestacao: z.number().int('Deve ser número inteiro').min(270, 'Mínimo 270').max(295, 'Máximo 295').optional(),
  dias_seca: z.number().int('Deve ser número inteiro').min(30, 'Mínimo 30').max(90, 'Máximo 90').optional(),
  pve_dias: z.number().int('Deve ser número inteiro').min(30, 'Mínimo 30').max(120, 'Máximo 120').optional(),
  coberturas_para_repetidora: z.number().int('Deve ser número inteiro').min(2, 'Mínimo 2').max(5, 'Máximo 5').optional(),
  janela_repetidora_dias: z.number().int('Deve ser número inteiro').min(90, 'Mínimo 90').max(365, 'Máximo 365').optional(),
  meta_taxa_prenhez_pct: z.number().int('Deve ser número inteiro').min(50, 'Mínimo 50').max(100, 'Máximo 100').optional(),
  meta_psm_dias: z.number().int('Deve ser número inteiro').min(50, 'Mínimo 50').max(120, 'Máximo 120').optional(),
  meta_iep_dias: z.number().int('Deve ser número inteiro').min(350, 'Mínimo 350').max(450, 'Máximo 450').optional(),
});

export type AtualizarParametrosReprodutivosInput = z.infer<typeof atualizarParametrosReprodutivosSchema>;
