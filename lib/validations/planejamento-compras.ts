import { z } from 'zod';
import { TIPOS_OPERACAO, STATUS_PLANEJAMENTO } from '../types/planejamento-compras';

export const planejamentoAtividadeSchema = z.object({
  talhao_id: z.string().uuid('Selecione um talhão'),
  ciclo_id: z.string().uuid().nullable().optional(),
  tipo_operacao: z.enum(TIPOS_OPERACAO),
  data_prevista: z.string().min(1, 'Data prevista é obrigatória'),
  observacoes: z.string().max(500).nullable().optional(),
});

export const atualizarStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUS_PLANEJAMENTO),
});

export const planejamentoInsumoSchema = z.object({
  planejamento_id: z.string().uuid(),
  insumo_id: z.string().uuid('Selecione um insumo'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
});

export const atualizarQuantidadeInsumoSchema = z.object({
  id: z.string().uuid(),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
});

export const marcarComoCompradoSchema = z.object({
  insumo_id: z.string().uuid(),
  quantidade_comprada: z.number().positive('Quantidade deve ser maior que zero'),
  valor_unitario_pago: z.number().positive().nullable().optional(),
  data_compra: z.string().min(1, 'Informe a data de compra'),
  // IDs das atividades cujos planejamentos serão marcados como origem
  planejamentos_ids: z.array(z.string().uuid()).min(1),
});

export const filtrosRelatorioSchema = z.object({
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  talhao_id: z.string().uuid().optional(),
  status_atividade: z.enum(STATUS_PLANEJAMENTO).optional(),
  apenas_com_necessidade: z.boolean().optional(),
});

export type PlanejamentoAtividadeInput = z.infer<typeof planejamentoAtividadeSchema>;
export type PlanejamentoInsumoInput = z.infer<typeof planejamentoInsumoSchema>;
export type MarcarComoCompradoInput = z.infer<typeof marcarComoCompradoSchema>;
export type FiltrosRelatorioInput = z.infer<typeof filtrosRelatorioSchema>;
