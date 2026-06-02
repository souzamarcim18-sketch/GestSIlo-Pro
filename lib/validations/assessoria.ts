import { z } from 'zod';

// Anotação
export const anotacaoFormSchema = z.object({
  titulo: z.string()
    .min(5, 'Título deve ter no mínimo 5 caracteres')
    .max(255),
  conteudo: z.string()
    .min(10, 'Mínimo 10 caracteres')
    .max(5000),
  categoria: z.enum(['duvida', 'observacao_campo', 'sugestao', 'outro']),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']),
});

export type AnotacaoFormInput = z.infer<typeof anotacaoFormSchema>;

// Marcar Anotação como Resolvida
export const marcarAnotacaoResolvidaSchema = z.object({
  resolvida: z.boolean(),
  assessor_resposta: z.string().optional(),
});

export type MarcarAnotacaoResolvidaInput = z.infer<typeof marcarAnotacaoResolvidaSchema>;

// Histórico
export const historicoAtendimentoSchema = z.object({
  titulo: z.string().min(5).max(255),
  resumo: z.string().min(10).max(2000),
  orientacoes_recebidas: z.string().max(5000).optional(),
  proximos_passos: z.string().max(5000).optional(),
  assessor_nome: z.string().max(255).optional(),
  data_atendimento: z.coerce.date(),
  agendamento_id: z.string().uuid().optional(),
});

export type HistoricoAtendimentoInput = z.infer<typeof historicoAtendimentoSchema>;
