'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';
import type { MovimentacaoComNome } from '@/types/insumos';

export function useMovimentacoes(filters?: any) {
  return useQuery({
    queryKey: ['movimentacoes', filters],
    queryFn: () => q.movimentacoesInsumo.listByFazenda(),
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useUltimasEntradas() {
  return useQuery({
    queryKey: ['movimentacoes', 'entradas'],
    queryFn: async () => {
      const movs = await q.movimentacoesInsumo.listByFazenda() as MovimentacaoComNome[];
      return movs
        .filter(m => m.tipo === 'Entrada')
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 4);
    },
    staleTime: 1000 * 30,
  });
}

export function useUltimasSaidas() {
  return useQuery({
    queryKey: ['movimentacoes', 'saidas'],
    queryFn: async () => {
      const movs = await q.movimentacoesInsumo.listByFazenda() as MovimentacaoComNome[];
      return movs
        .filter(m => m.tipo === 'Saída')
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 4);
    },
    staleTime: 1000 * 30,
  });
}

export function useMovimentacoesPorInsumo(insumoId: string) {
  return useQuery({
    queryKey: ['movimentacoes', insumoId],
    queryFn: () => q.movimentacoesInsumo.listByInsumo(insumoId),
    enabled: !!insumoId,
    staleTime: 1000 * 30,
  });
}

export function useMovimentacoesMutation() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: (data: any) => q.movimentacoesInsumo.create(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    createAjuste: useMutation({
      mutationFn: ({ insumo_id, estoque_real, motivo }: any) =>
        q.movimentacoesInsumo.createAjuste(insumo_id, estoque_real, motivo),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    remove: useMutation({
      mutationFn: (id: string) => q.movimentacoesInsumo.remove(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
  };
}
