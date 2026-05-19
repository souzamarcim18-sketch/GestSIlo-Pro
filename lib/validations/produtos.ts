import { z } from 'zod';

export const produtoFormSchema = z.object({
  nome:               z.string().min(2, 'Mínimo 2 caracteres').max(100),
  categoria_id:       z.string().uuid('Categoria inválida'),
  unidade:            z.string().min(1, 'Unidade obrigatória').max(20),
  quantidade_entrada: z.number().nonnegative('Não pode ser negativo').default(0),
  valor_unitario:     z.number().positive('Deve ser > 0').optional(),
  estoque_minimo:     z.number().nonnegative('Não pode ser negativo').default(0),
  custo_referencia:   z.number().positive('Deve ser > 0').optional(),
  local_armazen:      z.string().max(100).optional(),
  observacoes:        z.string().max(500).optional(),
});

export type ProdutoFormData = z.infer<typeof produtoFormSchema>;

export const entradaFormSchema = z.object({
  produto_id:     z.string().uuid('Produto inválido'),
  tipo_entrada:   z.enum(['COLHEITA', 'COMPRA', 'AJUSTE_INICIAL']),
  quantidade:     z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().positive('Deve ser > 0').optional(),
  data:           z.string().min(1, 'Data obrigatória'),
  responsavel:    z.string().max(100).optional(),
  observacoes:    z.string().max(500).optional(),
});

export type EntradaFormData = z.infer<typeof entradaFormSchema>;

export const saidaFormSchema = z.object({
  produto_id:           z.string().uuid('Produto inválido'),
  tipo_saida:           z.enum([
    'VENDA', 'CONSUMO_PROPRIO', 'PERDA', 'DOACAO', 'TRANSFERENCIA_INSUMO', 'DESCARTE',
  ]),
  quantidade:           z.number().positive('Deve ser > 0'),
  valor_unitario:       z.number().positive('Deve ser > 0').optional(),
  registrar_como_receita: z.boolean().default(false),
  insumo_id_destino:    z.string().uuid().optional(),
  data:                 z.string().min(1, 'Data obrigatória'),
  responsavel:          z.string().max(100).optional(),
  observacoes:          z.string().max(500).optional(),
})
  .refine(
    (d) => d.tipo_saida !== 'VENDA' || !!d.valor_unitario,
    { message: 'Valor unitário obrigatório para venda', path: ['valor_unitario'] }
  )
  .refine(
    (d) => d.tipo_saida !== 'TRANSFERENCIA_INSUMO' || !!d.insumo_id_destino,
    { message: 'Insumo de destino obrigatório para transferência', path: ['insumo_id_destino'] }
  );

export type SaidaFormData = z.infer<typeof saidaFormSchema>;

export const ajusteInventarioSchema = z.object({
  produto_id:   z.string().uuid('Produto inválido'),
  estoque_real: z.number().nonnegative('Não pode ser negativo'),
  motivo:       z.string().min(5, 'Mínimo 5 caracteres'),
});

export type AjusteInventarioData = z.infer<typeof ajusteInventarioSchema>;
