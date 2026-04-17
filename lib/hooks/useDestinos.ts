'use client';

import { useQuery } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export interface Destino {
  id: string;
  nome: string;
}

export function useTalhoes() {
  return useQuery({
    queryKey: ['talhoes', 'list'],
    queryFn: async () => {
      try {
        const talhoes = await q.talhoes.list();
        return (talhoes || []).map((t: any) => ({
          id: t.id,
          nome: t.nome || `Talhão ${t.id.substring(0, 8)}`,
        })) as Destino[];
      } catch (error) {
        console.error('Erro ao buscar talhões:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaquinas() {
  return useQuery({
    queryKey: ['maquinas', 'list'],
    queryFn: async () => {
      try {
        const maquinas = await q.maquinas.list();
        return (maquinas || []).map((m: any) => ({
          id: m.id,
          nome: m.nome || `Máquina ${m.id.substring(0, 8)}`,
        })) as Destino[];
      } catch (error) {
        console.error('Erro ao buscar máquinas:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSilos() {
  return useQuery({
    queryKey: ['silos', 'list'],
    queryFn: async () => {
      try {
        const silos = await q.silos.list();
        return (silos || []).map((s: any) => ({
          id: s.id,
          nome: s.nome || `Silo ${s.id.substring(0, 8)}`,
        })) as Destino[];
      } catch (error) {
        console.error('Erro ao buscar silos:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para buscar destinos de um tipo específico.
 * @param destino_tipo 'talhao' | 'maquina' | 'silo'
 */
export function useDestinos(destino_tipo?: string) {
  const talhoes = useTalhoes();
  const maquinas = useMaquinas();
  const silos = useSilos();

  return {
    data: destino_tipo === 'talhao'
      ? talhoes.data
      : destino_tipo === 'maquina'
        ? maquinas.data
        : destino_tipo === 'silo'
          ? silos.data
          : [],
    isLoading:
      (destino_tipo === 'talhao' ? talhoes.isLoading : false) ||
      (destino_tipo === 'maquina' ? maquinas.isLoading : false) ||
      (destino_tipo === 'silo' ? silos.isLoading : false),
  };
}
