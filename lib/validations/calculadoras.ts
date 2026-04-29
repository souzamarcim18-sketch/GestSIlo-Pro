/**
 * Schemas Zod para validação de inputs das calculadoras agrônomicas.
 * Fonte: SPEC-calculadoras.md v1.1
 */

import { z } from 'zod';

// ========== CALAGEM ==========
export const metodosCalagemSchema = z.enum([
  'saturacao',
  'al_ca_mg',
  'mg_manual',
  'smp',
  'ufla',
]);

export const calagemInputSchema = z.object({
  metodo: metodosCalagemSchema,
  area: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n > 0, 'Área deve ser > 0'),
  prnt: z
    .string()
    .transform((s) => parseFloat(s) || 80)
    .refine((n) => n > 0 && n <= 100, 'PRNT deve estar entre 0-100%'),

  // Método: Saturação por Bases
  v1: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .optional(),
  v2: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .optional(),
  ctc: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .optional(),

  // Método: Al + Ca/Mg
  al: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n >= 0, 'Al³⁺ não pode ser negativo')
    .optional(),
  ca: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n >= 0, 'Ca²⁺ não pode ser negativo')
    .optional(),
  mg: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n >= 0, 'Mg²⁺ não pode ser negativo')
    .optional(),

  // Método: SMP
  ph_smp: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .optional(),
  textura: z.enum(['arenosa', 'media', 'argilosa']).optional(),

  // Método: UFLA
  ca_desejado: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .optional(),
  cultura: z.string().optional(),
});

export type CalagemInputValidated = z.infer<typeof calagemInputSchema>;

// ========== NPK ==========
export const npkInputSchema = z.object({
  n_nec: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n >= 0, 'N não pode ser negativo'),
  p_nec: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n >= 0, 'P₂O₅ não pode ser negativo'),
  k_nec: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n >= 0, 'K₂O não pode ser negativo'),
  area: z
    .string()
    .transform((s) => parseFloat(s) || 0)
    .refine((n) => n > 0, 'Área é obrigatória'),
  modo: z.enum(['simples', 'otimizado']).default('simples'),
  fertilizantes_selecionados: z.array(z.string()).optional(),
});

export type NPKInputValidated = z.infer<typeof npkInputSchema>;
