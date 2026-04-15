import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * ──────────────────────────────────────────────────────────────
 * GEOCODING API ROUTE
 * ──────────────────────────────────────────────────────────────
 *
 * GET /api/geocoding?q=Ribeirao
 *
 * Server-side proxy para Nominatim (OpenStreetMap)
 * - Adiciona User-Agent correto (Nominatim exige)
 * - Filtra apenas Brasil (countrycodes=br)
 * - Busca apenas cidades (type: city, town, village)
 * - Retorna array de CityOption
 * - Cache-Control: 86400s (cidades não mudam)
 * - Timeout: 5 segundos
 */

interface NominatimResult {
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
  type?: string;
}

interface CityOption {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

const querySchema = z.object({
  q: z.string().min(3, 'Mínimo 3 caracteres').max(100),
});

export async function GET(req: NextRequest) {
  try {
    // 1. Validar query
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const validation = querySchema.safeParse({ q: query });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Parâmetro inválido' },
        { status: 400 }
      );
    }

    // 2. Chamar Nominatim
    const params = new URLSearchParams({
      q: `${query}, Brasil`,
      format: 'json',
      addressdetails: '1',      // OBRIGATÓRIO para ter address.city, address.state
      countrycodes: 'br',        // Apenas Brasil
      limit: '8',
      dedupe: '1',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GestSilo-Pro/1.0 (contato@gestsilo.com)',
          'Accept-Language': 'pt-BR',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[geocoding/route] Nominatim error:', response.status);
      return NextResponse.json(
        { error: 'Serviço de geolocalização indisponível' },
        { status: 503 }
      );
    }

    const data: NominatimResult[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=300', // cache negativo por 5min
        },
      });
    }

    // 3. Parse e filtrar resultados
    const cities: CityOption[] = data
      .filter((item) => {
        // Verificar se é do Brasil
        if (item.address?.country !== 'Brazil') {
          return false;
        }

        // Verificar se é cidade/town/village (não bairro ou rua)
        const validTypes = ['city', 'town', 'village'];
        if (item.type && !validTypes.includes(item.type)) {
          return false;
        }

        // Ter pelo menos uma unidade administrativa (state)
        if (!item.address?.state) {
          return false;
        }

        return true;
      })
      .map((item) => {
        const cityName = item.address.city || item.address.town || item.address.village || '';
        const stateName = item.address.state || '';

        return {
          name: cityName,
          state: stateName,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          displayName: `${cityName}, ${stateName}, Brasil`,
        };
      })
      // Remover duplicatas
      .reduce((acc: CityOption[], city: CityOption) => {
        const exists = acc.some(
          (c) =>
            c.name.toLowerCase() === city.name.toLowerCase() &&
            c.state.toLowerCase() === city.state.toLowerCase()
        );
        return exists ? acc : [...acc, city];
      }, [])
      .slice(0, 8); // Máximo 8 resultados

    return NextResponse.json(cities, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400', // 24h cache
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[geocoding/route] Timeout');
      return NextResponse.json(
        { error: 'Timeout ao buscar cidades' },
        { status: 503 }
      );
    }

    console.error('[geocoding/route] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
