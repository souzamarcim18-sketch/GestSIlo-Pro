import { z } from 'zod';
import { TipoEvento } from '@/lib/types/rebanho';

// ========== ANIMAL ==========

export const criarAnimalSchema = z.object({
  numero_animal: z
    .string()
    .min(1, 'Número do animal obrigatório')
    .max(255, 'Máximo 255 caracteres'),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' }),
  tipo_rebanho: z
    .enum(['leiteiro', 'corte'], { message: 'Tipo de rebanho inválido' })
    .default('leiteiro'),
  data_nascimento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data de nascimento deve ser válida e não futura'),
  lote_id: z.string().uuid('Lote inválido').nullable().optional(),
  mae_id: z.string().uuid('Mãe inválida').nullable().optional(),
  pai_id: z.string().uuid('Pai inválido').nullable().optional(),
  raca: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .optional()
    .nullable(),
});

export const editarAnimalSchema = z.object({
  sexo: z
    .enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' })
    .optional(),
  data_nascimento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data de nascimento deve ser válida e não futura')
    .optional(),
  lote_id: z.string().uuid('Lote inválido').nullable().optional(),
  mae_id: z.string().uuid('Mãe inválida').nullable().optional(),
  pai_id: z.string().uuid('Pai inválido').nullable().optional(),
  raca: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .nullable(),
  observacoes: z
    .string()
    .optional()
    .nullable(),
});

export type CriarAnimalInput = z.infer<typeof criarAnimalSchema>;
export type EditarAnimalInput = z.infer<typeof editarAnimalSchema>;

// ========== LOTE ==========

export const criarLoteSchema = z.object({
  nome: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(255, 'Máximo 255 caracteres'),
  descricao: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .nullable(),
});

export const editarLoteSchema = criarLoteSchema;

export type CriarLoteInput = z.infer<typeof criarLoteSchema>;
export type EditarLoteInput = z.infer<typeof editarLoteSchema>;

// ========== EVENTOS — NASCIMENTO ==========

export const criarEventoNascimentoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.NASCIMENTO),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoNascimentoInput = z.infer<typeof criarEventoNascimentoSchema>;

// ========== EVENTOS — PESAGEM ==========

export const criarEventoPesagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.PESAGEM),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  peso_kg: z
    .number()
    .positive('Peso deve ser maior que 0')
    .max(2000, 'Peso máximo: 2000 kg'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoPesagemInput = z.infer<typeof criarEventoPesagemSchema>;

// ========== EVENTOS — MORTE ==========

export const criarEventoMorteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.MORTE),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoMorteInput = z.infer<typeof criarEventoMorteSchema>;

// ========== EVENTOS — VENDA ==========

export const criarEventoVendaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.VENDA),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
  comprador: z.string().max(255, 'Máximo 255 caracteres').optional().nullable(),
  valor_venda: z.number().nonnegative('Valor não pode ser negativo').optional().nullable(),
});

export type CriarEventoVendaInput = z.infer<typeof criarEventoVendaSchema>;

// ========== EVENTOS — TRANSFERÊNCIA DE LOTE ==========

export const criarEventoTransferenciaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.TRANSFERENCIA_LOTE),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  lote_id_destino: z.string().uuid('Lote destino obrigatório e inválido'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoTransferenciaInput = z.infer<typeof criarEventoTransferenciaSchema>;

// ========== EVENTO GENÉRICO ==========

export const criarEventoSchema = z.union([
  criarEventoNascimentoSchema,
  criarEventoPesagemSchema,
  criarEventoMorteSchema,
  criarEventoVendaSchema,
  criarEventoTransferenciaSchema,
]);

export type CriarEventoInput = z.infer<typeof criarEventoSchema>;

// ========== CSV IMPORT ==========

export const animalCSVRowSchema = z.object({
  numero_animal: z
    .string()
    .min(1, 'Número do animal obrigatório')
    .max(255),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo deve ser Macho ou Fêmea' }),
  data_nascimento: z
    .string()
    .refine((val) => {
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime()) && isoDate <= new Date()) return true;

      const ddmmyyyy = val.split('/');
      if (ddmmyyyy.length === 3) {
        const date = new Date(`${ddmmyyyy[2]}-${ddmmyyyy[1]}-${ddmmyyyy[0]}`);
        return date <= new Date() && !isNaN(date.getTime());
      }
      return false;
    }, 'Data de nascimento inválida (use ISO ou DD/MM/YYYY)')
    .transform((val) => {
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
      const [d, m, y] = val.split('/');
      return `${y}-${m}-${d}`;
    }),
  tipo_rebanho: z
    .enum(['leiteiro', 'corte'])
    .default('leiteiro'),
  lote: z.string().optional().nullable(),
  raca: z.string().max(255).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type AnimalCSVRowInput = z.infer<typeof animalCSVRowSchema>;

export const importarCSVSchema = z.object({
  arquivo: z.instanceof(File, { message: 'Arquivo inválido' })
    .refine((file) => file.type === 'text/csv' || file.name.endsWith('.csv'), 'Apenas arquivo CSV')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Máximo 10MB'),
  criar_lote_automatico: z.boolean().default(true),
});

export type ImportarCSVInput = z.infer<typeof importarCSVSchema>;
