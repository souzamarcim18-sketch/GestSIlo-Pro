'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export function useInsumos(filters?: any) {
  return useQuery({
    queryKey: ['insumos', filters],
    queryFn: () => q.insumos.list(filters),
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useInsumoById(id: string) {
  return useQuery({
    queryKey: ['insumo', id],
    queryFn: () => q.insumos.getById(id),
  });
}

export function useInsumosAbaixoMinimo() {
  return useQuery({
    queryKey: ['insumos-criticos'],
    queryFn: () => q.insumos.listAbaixoMinimo(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useInsumosSearch(term: string) {
  return useQuery({
    queryKey: ['insumos-search', term],
    queryFn: () => q.insumos.searchByName(term),
    enabled: term.length > 1,
  });
}

export function useInsumosMutation() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: (data: any) => q.insumos.create(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    update: useMutation({
      mutationFn: ({ id, data }: any) => q.insumos.update(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    delete: useMutation({
      mutationFn: (id: string) => q.insumos.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
  };
}
