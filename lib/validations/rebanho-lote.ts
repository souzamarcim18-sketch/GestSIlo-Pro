import { z } from 'zod';

const dataEventoSchema = z.string().refine((val) => {
  const d = new Date(val);
  return !isNaN(d.getTime()) && d <= new Date();
}, 'Data inválida ou futura');

const animalIdSchema = z.string().uuid('animal_id deve ser UUID válido');

// ── Campos compartilhados por tipo ────────────────────────────────────────────

export const dadosCompartilhadosPorTipo = {
  pesagem: z.object({ data_evento: dataEventoSchema }),
  cobertura: z.object({
    data_evento: dataEventoSchema,
    tipo_cobertura: z.enum(
      ['monta_natural', 'ia_convencional', 'iatf', 'tetf', 'fiv', 'repasse'],
      { message: 'Tipo de cobertura inválido' }
    ),
  }),
  diagnostico_prenhez: z.object({
    data_evento: dataEventoSchema,
    metodo_diagnostico: z.enum(['palpacao', 'ultrassom', 'sangue'], {
      message: 'Método de diagnóstico inválido',
    }),
  }),
  transferencia_lote: z.object({
    data_evento: dataEventoSchema,
    lote_id_destino: z.string().uuid('Lote de destino obrigatório'),
  }),
  secagem: z.object({ data_evento: dataEventoSchema }),
  aborto: z.object({ data_evento: dataEventoSchema }),
  descarte: z.object({
    data_evento: dataEventoSchema,
    motivo_descarte: z.enum(
      ['idade', 'reprodutivo', 'sanitario', 'producao', 'aprumos', 'outro'],
      { message: 'Motivo de descarte inválido' }
    ),
  }),
  desmame: z.object({ data_evento: dataEventoSchema }),
  aspiracao_opu: z.object({ data_evento: dataEventoSchema }),
  protocolo_hormonal: z.object({
    data_evento: dataEventoSchema,
    finalidade_protocolo: z.enum(
      ['pre_iatf', 'pre_te', 'monta_natural', 'sincronizacao_receptoras'],
      { message: 'Finalidade do protocolo inválida' }
    ),
    produto_hormonal: z.string().max(255).optional().nullable(),
    dose_produto: z.string().max(100).optional().nullable(),
    via_aplicacao: z
      .enum(['IM', 'IV', 'SC', 'SL'], { message: 'Via de aplicação inválida' })
      .optional()
      .nullable(),
  }),
  transferencia_embriao: z.object({ data_evento: dataEventoSchema }),
} as const;

// ── Campos individuais por tipo ───────────────────────────────────────────────

export const dadosIndividuaisPorTipo = {
  pesagem: z.object({
    peso_kg: z.coerce
      .number()
      .positive('Peso deve ser maior que 0')
      .max(2000, 'Peso máximo: 2000 kg'),
    escore_condicao_corporal: z.coerce
      .number()
      .min(1, 'Mínimo 1')
      .max(5, 'Máximo 5')
      .multipleOf(0.5, 'Incremento de 0,5')
      .optional()
      .nullable(),
  }),
  cobertura: z.object({
    reprodutor_id: z.string().uuid('UUID inválido').optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  diagnostico_prenhez: z.object({
    resultado_prenhez: z.enum(['positivo', 'negativo', 'duvidoso'], {
      message: 'Resultado deve ser positivo, negativo ou duvidoso',
    }),
    idade_gestacional_dias: z.coerce
      .number()
      .int('Deve ser número inteiro')
      .min(0, 'Mínimo 0 dias')
      .max(300, 'Máximo 300 dias')
      .optional()
      .nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  transferencia_lote: z.object({}),
  secagem: z.object({
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  aborto: z.object({
    causa_aborto: z.string().max(500).optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  descarte: z.object({
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  desmame: z.object({
    peso_kg: z.coerce
      .number()
      .positive('Peso deve ser maior que 0')
      .max(2000, 'Peso máximo: 2000 kg')
      .optional()
      .nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  aspiracao_opu: z
    .object({
      oocitos_coletados: z.coerce
        .number()
        .int('Deve ser número inteiro')
        .min(0, 'Mínimo 0')
        .optional()
        .nullable(),
      oocitos_viaveis: z.coerce
        .number()
        .int('Deve ser número inteiro')
        .min(0, 'Mínimo 0')
        .optional()
        .nullable(),
      grau_qualidade_opu: z
        .enum(['I', 'II', 'III', 'IV'], { message: 'Grau inválido' })
        .optional()
        .nullable(),
      observacoes: z.string().max(1000).optional().nullable(),
    })
    .superRefine((d, ctx) => {
      if (d.oocitos_coletados != null && d.oocitos_viaveis != null) {
        if (d.oocitos_viaveis > d.oocitos_coletados) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Oócitos viáveis não pode exceder oócitos coletados',
            path: ['oocitos_viaveis'],
          });
        }
      }
    }),
  protocolo_hormonal: z.object({
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  transferencia_embriao: z.object({
    grau_embriao: z.coerce
      .number()
      .int('Deve ser número inteiro')
      .min(1, 'Mínimo 1')
      .max(4, 'Máximo 4')
      .optional()
      .nullable(),
    raca_embriao: z.string().max(255).optional().nullable(),
    reprodutor_id: z.string().uuid('UUID inválido').optional().nullable(),
    resultado_te: z
      .enum(['transferido', 'nao_transferido'], {
        message: 'Resultado deve ser "transferido" ou "nao_transferido"',
      })
      .optional()
      .nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
} as const;

// ── Schema da Server Action ───────────────────────────────────────────────────

const animalEntradaSchema = z.object({
  animal_id: animalIdSchema,
  dados_individuais: z.record(z.string(), z.unknown()),
});

export const criarEventosLoteSchema = z.object({
  tipo: z.enum([
    'pesagem',
    'cobertura',
    'diagnostico_prenhez',
    'transferencia_lote',
    'secagem',
    'aborto',
    'descarte',
    'desmame',
    'aspiracao_opu',
    'protocolo_hormonal',
    'transferencia_embriao',
  ] as const),
  dados_compartilhados: z.record(z.string(), z.unknown()),
  animais: z
    .array(animalEntradaSchema)
    .min(1, 'Selecione pelo menos 1 animal'),
});

export type CriarEventosLoteInput = z.infer<typeof criarEventosLoteSchema>;
