// lib/validations/insumos.ts

import { z } from 'zod';

// Schema para criar/editar insumo
export const insumoFormSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  categoria_id: z.string().uuid('Categoria inválida'),
  tipo_id: z.string().uuid('Tipo inválido').optional(),
  unidade: z.string().min(1, 'Unidade obrigatória').max(50),
  quantidade_entrada: z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().nonnegative('Não pode ser negativo'),
  fornecedor: z.string().min(1, 'Fornecedor obrigatório').max(255),
  local_armazen: z.string().min(1, 'Local de armazenamento obrigatório').max(255),
  estoque_minimo: z.number().nonnegative('Não pode ser negativo'),
  registrar_como_despesa: z.boolean(),
  observacoes: z.string().optional(),
});

export type InsumoFormData = z.infer<typeof insumoFormSchema>;

// Schema para saída de insumo
export const saidaFormSchema = z.object({
  insumo_id: z.string().uuid('Insumo inválido'),
  tipo_saida: z.enum(['USO_INTERNO', 'TRANSFERENCIA', 'VENDA', 'DEVOLUCAO', 'DESCARTE', 'TROCA']),
  quantidade: z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().nonnegative('Não pode ser negativo'),
  destino_tipo: z.enum(['talhao', 'maquina', 'silo']).optional(),
  destino_id: z.string().uuid().optional(),
  destino_texto: z.string().optional(), // Para saídas que não têm destino fixo
  responsavel: z.string().min(1, 'Responsável obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  observacoes: z.string().optional(),
}).refine(
  (data) => {
    // Se tipo_saida = USO_INTERNO, destino_tipo e destino_id obrigatórios
    if (data.tipo_saida === 'USO_INTERNO') {
      return data.destino_tipo && data.destino_id;
    }
    // Para outros tipos, destino_texto pode ser preenchido
    return true;
  },
  { message: 'Para Uso Interno, informe destino tipo e ID' }
);

export type SaidaFormData = z.infer<typeof saidaFormSchema>;

// Schema para ajuste de inventário
export const ajusteInventarioSchema = z.object({
  insumo_id: z.string().uuid('Insumo inválido'),
  estoque_real: z.number().nonnegative('Não pode ser negativo'),
  motivo: z.string().min(5, 'Mínimo 5 caracteres'),
});

export type AjusteInventarioData = z.infer<typeof ajusteInventarioSchema>;
