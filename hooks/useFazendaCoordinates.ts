import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * ──────────────────────────────────────────────────────────────
 * Hook: useFazendaCoordinates
 * ──────────────────────────────────────────────────────────────
 *
 * Busca latitude e longitude da fazenda do usuário logado
 * Usado para alimentar o WeatherWidget automaticamente
 */

export interface FazendaCoords {
  latitude: number | null;
  longitude: number | null;
  location: string | null;
}

export function useFazendaCoordinates(fazendaId: string | null) {
  const [coords, setCoords] = useState<FazendaCoords>({
    latitude: null,
    longitude: null,
    location: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fazendaId) {
      setCoords({ latitude: null, longitude: null, location: null });
      setLoading(false);
      return;
    }

    const fetchCoordinates = async () => {
      try {
        const { data, error } = await supabase
          .from('fazendas')
          .select('latitude, longitude, localizacao')
          .eq('id', fazendaId)
          .single();

        if (error) throw error;

        if (data) {
          setCoords({
            latitude: data.latitude,
            longitude: data.longitude,
            location: data.localizacao || 'Sua fazenda',
          });
        }
      } catch (err) {
        console.error('[useFazendaCoordinates] Error:', err);
        setCoords({ latitude: null, longitude: null, location: null });
      } finally {
        setLoading(false);
      }
    };

    fetchCoordinates();
  }, [fazendaId]);

  return { ...coords, loading };
}
