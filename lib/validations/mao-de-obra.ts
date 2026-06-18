import { z } from 'zod';

export const colaboradorFormSchema = z.object({
  nome:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres')
                         .max(100, 'Nome deve ter no máximo 100 caracteres'),
  funcao:      z.enum(['Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros']),
  vinculo:     z.enum(['CLT', 'Diarista', 'Empreiteiro', 'Familiar']),
  tipo_valor:  z.enum(['diaria', 'hora', 'mensal']),
  valor_ref:   z.number().nonnegative('Valor não pode ser negativo'),
  observacoes: z.string().max(500).optional().nullable(),
}).superRefine((d, ctx) => {
  // CLT é sempre mensal (salário); demais vínculos nunca são mensais.
  if (d.vinculo === 'CLT' && d.tipo_valor !== 'mensal') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Colaborador CLT deve ter valor mensal (salário).',
      path: ['tipo_valor'],
    });
  }
  if (d.vinculo !== 'CLT' && d.tipo_valor === 'mensal') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Valor mensal é permitido apenas para vínculo CLT.',
      path: ['tipo_valor'],
    });
  }
  // CLT exige salário > 0; Familiar pode ter valor 0 (sem custo).
  if (d.vinculo === 'CLT' && d.valor_ref <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o salário mensal do colaborador CLT.',
      path: ['valor_ref'],
    });
  }
});

export type ColaboradorFormData = z.infer<typeof colaboradorFormSchema>;

export const atividadeFormSchema = z.object({
  data:           z.string().min(1, 'Data é obrigatória'),
  tipo_atividade: z.enum([
    'Trato/alimentação do rebanho',
    'Ordenha',
    'Aplicação de defensivo',
    'Adubação',
    'Silagem (colheita/compactação/cobertura)',
    'Manutenção de cerca',
    'Manutenção de equipamento',
    'Limpeza de instalações',
    'Manejo sanitário',
    'Irrigação',
    'Roçagem',
    'Transporte interno',
    'Outros',
  ]),
  colaboradores:  z.array(z.string().uuid())
                   .min(1, 'Selecione ao menos 1 colaborador'),
  duracao_tipo:   z.enum(['horas', 'dias']),
  duracao_valor:  z.number().positive('Duração deve ser maior que zero'),
  custo_manual:   z.number().nonnegative().optional().nullable(),
  talhao_id:      z.string().uuid().optional().nullable(),
  silo_id:        z.string().uuid().optional().nullable(),
  maquina_id:     z.string().uuid().optional().nullable(),
  observacoes:    z.string().max(500).optional().nullable(),
}).refine(
  (d) => [d.talhao_id, d.silo_id, d.maquina_id].filter(Boolean).length <= 1,
  {
    message: 'Associe a no máximo um: talhão, silo ou máquina',
    path: ['talhao_id'],
  }
);

export type AtividadeFormData = z.infer<typeof atividadeFormSchema>;
