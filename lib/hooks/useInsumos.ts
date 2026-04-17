'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { q } from '@/lib/supabase/queries-audit';
import { supabase } from '@/lib/supabase';
import type {
  Insumo,
  ListInsumosFilter,
  PaginationOptions,
} from '@/types/insumos';
import type { InsumoFormData } from '@/lib/validations/insumos';

// ============================================
// QUERIES (leitura)
// ============================================

export function useInsumos(
  filters?: ListInsumosFilter,
  pagination?: PaginationOptions
) {
  return useQuery({
    queryKey: ['insumos', 'list', filters, pagination],
    queryFn: () => q.insumos.list(filters, pagination),
    staleTime: 1000 * 60,
  });
}

export function useInsumoById(id: string | undefined) {
  return useQuery({
    queryKey: ['insumos', 'detail', id],
    queryFn: () => q.insumos.getById(id!),
    enabled: !!id,
  });
}

export function useInsumosAbaixoMinimo() {
  return useQuery({
    queryKey: ['insumos', 'criticos'],
    queryFn: () => q.insumos.listAbaixoMinimo(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Busca com debounce de 300ms para evitar requests excessivos
 * durante a digitação no autocomplete.
 */
export function useInsumosSearch(term: string) {
  const [debouncedTerm] = useDebounce(term, 300);

  return useQuery({
    queryKey: ['insumos', 'search', debouncedTerm],
    queryFn: () => q.insumos.searchByName(debouncedTerm, 10),
    enabled: debouncedTerm.length > 1,
    staleTime: 1000 * 30,
  });
}

// ============================================
// HELPERS (transformação form → DB)
// ============================================

/**
 * Payload mínimo para criação — somente campos controlados pelo usuário.
 * Campos como `ativo`, `criado_em`, `atualizado_em` devem ter DEFAULT no Postgres.
 */
type CreateInsumoPayload = Pick<
  Insumo,
  | 'nome'
  | 'unidade'
  | 'estoque_atual'
  | 'estoque_minimo'
  | 'custo_medio'
  | 'categoria_id'
  | 'tipo_id'
  | 'fornecedor'
  | 'local_armazen'
  | 'observacoes'
>;

/**
 * Transforma o payload do formulário (Zod) para o formato do banco.
 *
 * Regras:
 * - estoque_atual = quantidade_entrada (estoque inicial = 1ª compra)
 * - custo_medio = valor_unitario
 */
function formToDbPayload(data: InsumoFormData): CreateInsumoPayload {
  return {
    nome: data.nome,
    unidade: data.unidade,
    estoque_atual: data.quantidade_entrada,
    estoque_minimo: data.estoque_minimo,
    custo_medio: data.valor_unitario,
    categoria_id: data.categoria_id,
    tipo_id: data.tipo_id ?? undefined,
    fornecedor: data.fornecedor,
    local_armazen: data.local_armazen,
    observacoes: data.observacoes,
  };
}

/**
 * Update parcial — só envia campos realmente informados.
 */
function formToDbPartialPayload(
  data: Partial<InsumoFormData>
): Partial<CreateInsumoPayload> {
  const payload: Partial<CreateInsumoPayload> = {};

  if (data.nome !== undefined) payload.nome = data.nome;
  if (data.unidade !== undefined) payload.unidade = data.unidade;
  if (data.estoque_minimo !== undefined) payload.estoque_minimo = data.estoque_minimo;
  if (data.categoria_id !== undefined) payload.categoria_id = data.categoria_id;
  if (data.tipo_id !== undefined) payload.tipo_id = data.tipo_id ?? undefined;
  if (data.valor_unitario !== undefined) payload.custo_medio = data.valor_unitario;
  if (data.fornecedor !== undefined) payload.fornecedor = data.fornecedor;
  if (data.local_armazen !== undefined) payload.local_armazen = data.local_armazen;
  if (data.observacoes !== undefined) payload.observacoes = data.observacoes;

  return payload;
}

/**
 * Registra despesa automaticamente no financeiro quando `registrar_como_despesa = true`.
 * Silencioso em caso de erro (não bloqueia o fluxo de cadastro do insumo).
 */
async function registrarDespesaInsumo(params: {
  insumoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  fornecedor: string;
  fazendaId: string;
}) {
  const valorTotal = params.quantidade * params.valorUnitario;
  if (valorTotal <= 0) return;

  const { error } = await supabase.from('financeiro').insert({
    tipo: 'Despesa',
    descricao: `Compra de insumo: ${params.nome} (${params.fornecedor})`,
    categoria: 'Insumos',
    valor: valorTotal,
    data: new Date().toISOString().slice(0, 10),
    forma_pagamento: null,
    referencia_id: params.insumoId,
    referencia_tipo: null, // 'Insumo' ainda não está no enum — ajustar em migration futura
    fazenda_id: params.fazendaId,
  });

  if (error) {
    console.error('[useInsumos] Falha ao registrar despesa automática:', error);
  }
}

// ============================================
// MUTATIONS (escrita)
// ============================================

export function useInsumosMutation() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['insumos'] });
    queryClient.invalidateQueries({ queryKey: ['financeiro'] });
  };

  return {
    create: useMutation({
      mutationFn: async (data: InsumoFormData) => {
        // 1) Cria o insumo
        const payload = formToDbPayload(data);
        // ⚠️ Cast necessário: o tipo de q.insumos.create() pode esperar Insumo completo,
        // mas campos como `ativo`, `criado_em`, `atualizado_em`, `fazenda_id` devem ser
        // preenchidos automaticamente (DEFAULT no DB ou injetados pela camada de queries).
        const insumoCriado = await q.insumos.create(payload as Parameters<typeof q.insumos.create>[0]);

        // 2) Se solicitado, registra despesa no financeiro
        if (data.registrar_como_despesa && insumoCriado?.id && insumoCriado?.fazenda_id) {
          await registrarDespesaInsumo({
            insumoId: insumoCriado.id,
            nome: data.nome,
            quantidade: data.quantidade_entrada,
            valorUnitario: data.valor_unitario,
            fornecedor: data.fornecedor,
            fazendaId: insumoCriado.fazenda_id,
          });
        }

        return insumoCriado;
      },
      onSuccess: invalidateAll,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<InsumoFormData> }) => {
        const payload = formToDbPartialPayload(data);
        return q.insumos.update(id, payload as Parameters<typeof q.insumos.update>[1]);
      },
      onSuccess: invalidateAll,
    }),

    delete: useMutation({
      mutationFn: (id: string) => q.insumos.delete(id),
      onSuccess: invalidateAll,
    }),
  };
}
