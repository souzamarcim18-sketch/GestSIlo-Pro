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
      console.log('[geocoding/route] Nominatim retornou vazio para:', query);
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=300', // cache negativo por 5min
        },
      });
    }

    console.log(`[geocoding/route] Nominatim: ${data.length} resultados para "${query}"`);

    // 3. Parse e filtrar resultados
    const cities: CityOption[] = data
      .filter((item) => {
        // Verificar se é do Brasil (countrycodes=br já filtrou, mas Nominatim pode retornar
        // tanto "Brazil" (EN) quanto "Brasil" (PT-BR) dependendo do Accept-Language)
        const country = item.address?.country || '';
        if (country !== 'Brazil' && country !== 'Brasil') {
          return false;
        }

        // Ter um nome de cidade válido
        const cityName = item.address?.city || item.address?.town || item.address?.village || '';
        if (!cityName || cityName.trim() === '') {
          return false;
        }

        // Ter pelo menos um estado/unidade administrativa
        if (!item.address?.state || item.address.state.trim() === '') {
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

    console.log(`[geocoding/route] ${cities.length} cidades retornadas após filtragem`);

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
