'use client';

import { useQuery } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => q.categorias.list(),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useTiposByCategoria(categoria_id: string) {
  return useQuery({
    queryKey: ['tipos', categoria_id],
    queryFn: () => q.tipos.listByCategoria(categoria_id),
    enabled: !!categoria_id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useLocais() {
  return useQuery({
    queryKey: ['locais'],
    queryFn: () => q.locais.listDistinct(),
    staleTime: 1000 * 60 * 10,
  });
}
