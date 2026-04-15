import { useState, useCallback } from 'react';

/**
 * ──────────────────────────────────────────────────────────────
 * Hook: useGeocoding
 * ──────────────────────────────────────────────────────────────
 *
 * Busca coordenadas (lat/lon) de cidades brasileiras via
 * API Route /api/geocoding (proxy server-side para Nominatim)
 */

export interface CityOption {
  name: string;           // "Ribeirão Preto"
  state: string;          // "São Paulo"
  latitude: number;
  longitude: number;
  displayName: string;    // "Ribeirão Preto, São Paulo, Brasil"
}

interface GeocodeResponse {
  error?: string;
}

/**
 * Busca cidades brasileiras por nome
 * Requer 3+ caracteres para começar a buscar
 * Chamadas são feitas via /api/geocoding (server-side proxy)
 */
export function useGeocoding() {
  const [results, setResults] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCities = useCallback(async (query: string): Promise<void> => {
    // Limpar se query muito curto
    if (!query || query.length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Chamar API Route server-side (não Nominatim direto)
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/geocoding?${params}`);

      if (!response.ok) {
        const errorData = (await response.json()) as GeocodeResponse;
        throw new Error(
          errorData.error || 'Erro ao buscar cidades'
        );
      }

      const cities: CityOption[] = await response.json();

      if (!Array.isArray(cities)) {
        throw new Error('Resposta inválida do servidor');
      }

      setResults(cities);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar cidades';
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    searchCities,
    clear,
  };
}
