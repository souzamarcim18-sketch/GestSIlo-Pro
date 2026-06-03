import { z } from 'zod';

export const solicitarAcessoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(100),
  email: z.string().email('E-mail inválido'),
  fazenda: z.string().min(2, 'Nome da fazenda obrigatório').max(100),
  whatsapp: z
    .string()
    .regex(/^\(\d{2}\) \d{5}-\d{4}$/, 'Formato: (99) 99999-9999'),
  plano: z.enum(['free', 'starter', 'pro', 'max']).default('free'),
});

export type SolicitarAcessoInput = z.infer<typeof solicitarAcessoSchema>;
