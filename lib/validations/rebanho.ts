import { z } from 'zod';
import { TipoEvento } from '@/lib/types/rebanho';

// ========== ANIMAL ==========

export const criarAnimalSchema = z.object({
  brinco: z.string().min(1, 'Brinco obrigatório').max(255),
  nome: z.string().max(255).optional().nullable(),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo inválido' }),
  tipo_rebanho: z
    .enum(['leiteiro', 'corte', 'dupla_aptidao'], {
      message: 'Tipo de rebanho inválido',
    })
    .default('leiteiro'),
  data_nascimento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data deve ser válida e não futura'),
  data_nascimento_estimada: z.boolean().default(false),
  lote_id: z.string().uuid().nullable().optional(),
  mae_id: z.string().uuid().nullable().optional(),
  pai_id: z.string().uuid().nullable().optional(),
  raca: z.string().max(255).optional().nullable(),
  origem: z.enum(['nascido', 'comprado']).optional().nullable(),
  peso_nascimento: z.coerce.number().positive().max(200).optional().nullable(),
  sisbov_crbio: z.string().max(100).optional().nullable(),
  observacoes: z.string().optional().nullable(),
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
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  descricao: z.string().max(500).optional().nullable(),
  tipo_rebanho: z.enum(['leiteiro', 'corte', 'misto']).optional().nullable(),
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
  animal_id: z.string().uuid(),
  tipo: z.literal(TipoEvento.PESAGEM),
  data_evento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data deve ser válida e não futura'),
  peso_kg: z.number().positive('Peso deve ser maior que 0').max(2000),
  metodo: z.enum(['balanca', 'estimativa_visual']).optional(),
  condicao_corporal: z.number().int().min(1).max(5).optional().nullable(),
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

// ========== EVENTOS — COBERTURA ==========

export const criarEventoCoberturaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.COBERTURA),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  reprodutor_id: z.string().uuid('Reprodutor inválido').optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoCoberturaInput = z.infer<typeof criarEventoCoberturaSchema>;

// ========== EVENTOS — DIAGNÓSTICO DE PRENHEZ ==========

export const criarEventoDiagnosticoPrenhezSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.DIAGNOSTICO_PRENHEZ),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  resultado: z.enum(['positivo', 'negativo'], { message: 'Resultado obrigatório' }),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoDiagnosticoPrenhezInput = z.infer<typeof criarEventoDiagnosticoPrenhezSchema>;

// ========== EVENTOS — PARTO ==========

export const criarEventoPartoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.PARTO),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  tipo_parto: z.enum(['simples', 'gemelar', 'triplo']).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoPartoInput = z.infer<typeof criarEventoPartoSchema>;

// ========== EVENTOS — DESMAME (mínimo) ==========

export const criarEventoDesmameSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.DESMAME),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoDesmameInput = z.infer<typeof criarEventoDesmameSchema>;

// ========== EVENTOS — SECAGEM (mínimo) ==========

export const criarEventoSecagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.SECAGEM),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoSecagemInput = z.infer<typeof criarEventoSecagemSchema>;

// ========== EVENTOS — ABORTO (mínimo) ==========

export const criarEventoAbortoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.ABORTO),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoAbortoInput = z.infer<typeof criarEventoAbortoSchema>;

// ========== EVENTOS — DESCARTE (mínimo) ==========

export const criarEventoDescarteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.literal(TipoEvento.DESCARTE),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().optional().nullable(),
});

export type CriarEventoDescarteInput = z.infer<typeof criarEventoDescarteSchema>;

// ========== EVENTO GENÉRICO ==========

export const criarEventoSchema = z.union([
  criarEventoNascimentoSchema,
  criarEventoPesagemSchema,
  criarEventoMorteSchema,
  criarEventoVendaSchema,
  criarEventoTransferenciaSchema,
  criarEventoCoberturaSchema,
  criarEventoDiagnosticoPrenhezSchema,
  criarEventoPartoSchema,
  criarEventoDesmameSchema,
  criarEventoSecagemSchema,
  criarEventoAbortoSchema,
  criarEventoDescarteSchema,
]);

export type CriarEventoInput = z.infer<typeof criarEventoSchema>;

// ========== PRODUÇÃO LEITEIRA ==========

export const criarProducaoLeiteiraSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  data: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data inválida ou futura'),
  turno: z.enum(['manha', 'tarde', 'noite', 'dia_inteiro'], {
    message: 'Turno inválido',
  }),
  volume_litros: z.number().positive('Volume deve ser > 0').max(100),
  observacoes: z.string().optional().nullable(),
});

export type CriarProducaoLeiteiraInput = z.infer<typeof criarProducaoLeiteiraSchema>;

// ========== EVENTOS SANITÁRIOS ==========

export const criarEventoSanitarioSchema = z.discriminatedUnion('tipo', [
  // Vacinação
  z.object({
    tipo: z.literal('vacinacao'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    vacina_nome: z.string().min(1, 'Nome da vacina obrigatório').max(255),
    dose: z.string().min(1).max(100),
    via_aplicacao: z.enum(['subcutanea', 'intramuscular', 'intranasal', 'oral', 'topica']),
    lote_produto: z.string().max(100).optional().nullable(),
    data_proxima_dose: z.string().optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
    colaborador_id: z.string().uuid().optional(),
  }),
  // Vermifugação
  z.object({
    tipo: z.literal('vermifugacao'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    vacina_nome: z.string().min(1, 'Nome do produto obrigatório').max(255),
    via_aplicacao: z.enum(['subcutanea', 'intramuscular', 'intranasal', 'oral', 'topica']),
    lote_produto: z.string().max(100).optional().nullable(),
    data_proxima_dose: z.string().optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
    colaborador_id: z.string().uuid().optional(),
  }),
  // Tratamento veterinário
  z.object({
    tipo: z.literal('tratamento_veterinario'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    diagnostico: z.string().min(1, 'Diagnóstico obrigatório').max(500),
    medicamento: z.string().min(1, 'Medicamento obrigatório').max(255),
    duracao_dias: z.number().int().positive().optional().nullable(),
    resultado: z.enum(['cura', 'melhora', 'sem_resposta', 'obito', 'em_tratamento']).optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
    colaborador_id: z.string().uuid().optional(),
  }),
  // Exame laboratorial
  z.object({
    tipo: z.literal('exame_laboratorial'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    tipo_exame: z.string().min(1, 'Tipo de exame obrigatório').max(255),
    resultado: z.string().max(500).optional().nullable(),
    numero_protocolo: z.string().max(100).optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
    colaborador_id: z.string().uuid().optional(),
  }),
]);

export type CriarEventoSanitarioInput = z.infer<typeof criarEventoSanitarioSchema>;

// ========== CSV IMPORT ==========

export const animalCSVRowSchema = z.object({
  brinco: z
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
  data_nascimento_estimada: z.boolean().default(false).optional(),
  tipo_rebanho: z
    .enum(['leiteiro', 'corte', 'dupla_aptidao'])
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
