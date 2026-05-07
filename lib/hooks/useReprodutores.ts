'use client';

import { useEffect, useState } from 'react';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';

/**
 * Hook para carregar reprodutores da API
 * Usado em formulários de registro de eventos reprodutivos
 */
export function useReprodutores() {
  const [reprodutores, setReprodutores] = useState<Reprodutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReprodutores = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/rebanho/reprodutores', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Erro ao carregar reprodutores: ${response.statusText}`);
        }

        const data = await response.json();
        setReprodutores(data.dados || []);
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(mensagem);
        console.error('Erro ao carregar reprodutores:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReprodutores();
  }, []);

  return { reprodutores, isLoading, error };
}
