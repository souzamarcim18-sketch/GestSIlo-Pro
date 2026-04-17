'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export function useMovimentacoes(filters?: any) {
  return useQuery({
    queryKey: ['movimentacoes', filters],
    queryFn: () => q.movimentacoesInsumo.listByFazenda(),
    staleTime: 1000 * 30, // 30 segundos
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
