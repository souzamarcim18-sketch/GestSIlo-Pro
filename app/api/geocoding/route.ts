import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * ──────────────────────────────────────────────────────────────
 * GEOCODING API ROUTE v2
 * ──────────────────────────────────────────────────────────────
 *
 * GET /api/geocoding?q=Marip
 *
 * Estratégia melhorada:
 * 1. Nominatim com parameters NÃO RESTRITIVOS
 * 2. Parse FLEXÍVEL (qualquer localidade com estado é válida)
 * 3. Busca substring + ranking por relevância
 * 4. Retorna até 15 resultados
 */

interface NominatimResult {
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    borough?: string;
    suburb?: string;
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
  q: z.string().min(2, 'Mínimo 2 caracteres').max(100), // Reduzir de 3 para 2
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const validation = querySchema.safeParse({ q: query });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Parâmetro inválido' },
        { status: 400 }
      );
    }

    // Nominatim: SEM RESTRIÇÕES DE TIPO
    // Deixar retornar tudo e fazer filtragem flexível no client
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      countrycodes: 'br',
      limit: '50',           // ⚠️ AUMENTAR MUITO: queremos cobrir tudo
      dedupe: '1',
      // Remover: type=city (muito restritivo!)
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

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
      console.error('[geocoding] Nominatim error:', response.status);
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      });
    }

    const data: NominatimResult[] = await response.json();
    console.log(`[geocoding] Nominatim retornou ${data.length} items para "${query}"`);

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'public, s-maxage=300' },
      });
    }

    // FILTRAGEM FLEXÍVEL
    const cities: CityOption[] = data
      .filter((item) => {
        // Brasil check (menos restritivo)
        const country = item.address?.country || '';
        if (country !== 'Brazil' && country !== 'Brasil') {
          return false;
        }

        // Qualquer localidade com estado é válida
        const cityName =
          item.address?.city ||
          item.address?.town ||
          item.address?.village ||
          item.address?.municipality ||
          item.address?.borough ||
          item.address?.suburb ||
          '';

        return !!(cityName?.trim() && item.address?.state?.trim());
      })
      .map((item) => {
        const cityName =
          item.address.city ||
          item.address.town ||
          item.address.village ||
          item.address.municipality ||
          item.address.borough ||
          item.address.suburb ||
          '';

        return {
          name: cityName,
          state: item.address.state || '',
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          displayName: `${cityName}, ${item.address.state}, Brasil`,
        };
      })
      // Remover EXATAS duplicatas
      .reduce((acc: CityOption[], city: CityOption) => {
        const isDup = acc.some(
          (c) =>
            c.name.toLowerCase() === city.name.toLowerCase() &&
            c.state.toLowerCase() === city.state.toLowerCase()
        );
        return isDup ? acc : [...acc, city];
      }, [])
      // RANKING: cidades que começam com a query vêm primeiro
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
        return aStarts - bStarts;
      })
      .slice(0, 15); // Retornar até 15

    console.log(`[geocoding] ${cities.length} cidades após filtragem para "${query}"`);

    return NextResponse.json(cities, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[geocoding] Timeout');
      return NextResponse.json([]);
    }

    console.error('[geocoding] Error:', error);
    return NextResponse.json([]);
  }
}
