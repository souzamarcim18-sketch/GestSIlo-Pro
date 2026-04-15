import { NextRequest, NextResponse } from 'next/server';
import {
  type MarketQuotesData,
  type MarketQuote,
  marketQuotesDataSchema,
} from '@/lib/market';

/**
 * ──────────────────────────────────────────────────────────────
 * COTAÇÕES DE MERCADO API ROUTE
 * ──────────────────────────────────────────────────────────────
 *
 * GET /api/cotacoes
 *
 * Busca cotações de mercado agrícola (Boi, Leite, Milho, Soja)
 * Estratégia (Correção 5):
 * 1º → Redação Agro (dados CEPEA reais) — implementar quando API disponível
 * 2º → Cache server-side (dados da última busca bem-sucedida)
 * 3º → Mock data estruturada (último recurso)
 *
 * Headers: Cache-Control: public, s-maxage=7200, stale-while-revalidate=3600
 */

/**
 * Cache em memória server-side
 * Última busca bem-sucedida de cotações
 */
let quotesCache: {
  data: MarketQuotesData;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas (CEPEA atualiza 1x/dia)

/**
 * Mock data estruturada com valores realistas
 * Usado como fallback quando API real não está disponível
 */
function generateMockQuotes(): MarketQuote[] {
  const now = new Date();

  // Simular pequenas variações baseado no horário
  const hourSeed = now.getHours();
  const dayVariation = Math.sin(hourSeed / 24) * 0.02; // ±2%

  return [
    {
      symbol: 'BOI',
      name: 'Boi Gordo (@)',
      unit: '@',
      currentPrice: 285.50 * (1 + dayVariation),
      previousPrice: 280.10,
      variation: (285.50 * (1 + dayVariation)) - 280.10,
      variationPercent: ((285.50 * (1 + dayVariation)) - 280.10) / 280.10 * 100,
      trend: ((285.50 * (1 + dayVariation)) - 280.10) > 0 ? 'up' : 'down',
      lastUpdate: now.toISOString(),
      source: 'mock',
      high24h: 290.00,
      low24h: 278.50,
    },
    {
      symbol: 'LEITE',
      name: 'Leite (R$/L)',
      unit: 'L',
      currentPrice: 1.89 * (1 + dayVariation),
      previousPrice: 1.84,
      variation: (1.89 * (1 + dayVariation)) - 1.84,
      variationPercent: ((1.89 * (1 + dayVariation)) - 1.84) / 1.84 * 100,
      trend: ((1.89 * (1 + dayVariation)) - 1.84) > 0 ? 'up' : 'down',
      lastUpdate: now.toISOString(),
      source: 'mock',
      high24h: 1.95,
      low24h: 1.80,
    },
    {
      symbol: 'MILHO',
      name: 'Milho (sc 60kg)',
      unit: 'sc',
      currentPrice: 68.30 * (1 + dayVariation),
      previousPrice: 69.50,
      variation: (68.30 * (1 + dayVariation)) - 69.50,
      variationPercent: ((68.30 * (1 + dayVariation)) - 69.50) / 69.50 * 100,
      trend: ((68.30 * (1 + dayVariation)) - 69.50) > 0 ? 'up' : 'down',
      lastUpdate: now.toISOString(),
      source: 'mock',
      high24h: 70.20,
      low24h: 67.80,
    },
    {
      symbol: 'SOJA',
      name: 'Soja (sc 60kg)',
      unit: 'sc',
      currentPrice: 135.40 * (1 + dayVariation),
      previousPrice: 131.60,
      variation: (135.40 * (1 + dayVariation)) - 131.60,
      variationPercent: ((135.40 * (1 + dayVariation)) - 131.60) / 131.60 * 100,
      trend: ((135.40 * (1 + dayVariation)) - 131.60) > 0 ? 'up' : 'down',
      lastUpdate: now.toISOString(),
      source: 'mock',
      high24h: 137.50,
      low24h: 130.80,
    },
  ];
}

/**
 * Busca cotações da Redação Agro (CEPEA)
 * TODO: Implementar quando API real estiver disponível
 *
 * Estratégia quando integrar com Redação Agro:
 * 1. Investigar https://www.redacaoagro.com.br/ferramentas-cotacoes.php
 * 2. Identificar endpoint JSON ou fazer parse do HTML
 * 3. Extrair: Boi Gordo (@), Leite (R$/L), Milho (sc 60kg), Soja (sc 60kg)
 * 4. Retornar array de MarketQuote com source: 'redacaoagro'
 */
async function fetchFromRedacaoAgro(): Promise<MarketQuote[] | null> {
  try {
    // Placeholder: fazer fetch quando API real disponível
    // const url = 'https://www.redacaoagro.com.br/api/cotacoes'; // exemplo
    // const res = await fetch(url, { next: { revalidate: 3600 } });
    // const data = await res.json();
    // return parseRedacaoAgroData(data);

    return null; // Ainda não implementado
  } catch (error) {
    console.warn('[cotacoes/route] Erro ao buscar Redação Agro:', error);
    return null;
  }
}

/**
 * Handler GET
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    // 1. Check cache server-side
    if (quotesCache && Date.now() - quotesCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(quotesCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600',
          'X-Cache-Status': 'hit',
        },
      });
    }

    // 2. Tentar Redação Agro (implementar em Fase 2)
    let quotes: MarketQuote[] | null = null;
    let source: string = 'mock';

    quotes = await fetchFromRedacaoAgro();
    if (quotes) {
      source = 'redacaoagro';
    }

    // 3. Fallback: Cache expirado mas ainda disponível
    if (!quotes && quotesCache) {
      const cachedData: MarketQuotesData = {
        ...quotesCache.data,
        isOffline: true,
        fetchedAt: now.toISOString(),
      };

      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600',
          'X-Cache-Status': 'offline',
        },
      });
    }

    // 4. Fallback: Mock data
    if (!quotes) {
      quotes = generateMockQuotes();
      source = 'mock';
    }

    // 5. Construir resposta
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4h de cache

    const quotesData: MarketQuotesData = {
      quotes,
      lastUpdate: now.toISOString(),
      fetchedAt: now.toISOString(),
      isOffline: false,
      isAvailable: true,
      cacheExpiresAt: expiresAt.toISOString(),
    };

    // Validate against schema
    const validated = marketQuotesDataSchema.parse(quotesData);

    // 6. Save to cache
    quotesCache = {
      data: validated,
      timestamp: Date.now(),
    };

    // 7. Return
    return NextResponse.json(validated, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600',
        'X-Cache-Status': source === 'mock' ? 'miss' : 'hit',
      },
    });
  } catch (error) {
    console.error('[cotacoes/route] Erro inesperado:', error);

    // Fallback: retornar cache mesmo que inválido
    if (quotesCache) {
      const cachedData: MarketQuotesData = {
        ...quotesCache.data,
        isOffline: true,
        isAvailable: false,
        errorMessage: 'Erro ao buscar cotações. Mostrando dados em cache.',
      };

      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=7200',
          'X-Cache-Status': 'offline',
        },
      });
    }

    // Última tentativa: mock data
    const mockQuotes = generateMockQuotes();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const fallbackData: MarketQuotesData = {
      quotes: mockQuotes,
      lastUpdate: now.toISOString(),
      fetchedAt: now.toISOString(),
      isOffline: true,
      isAvailable: false,
      errorMessage: 'Erro ao buscar cotações. Mostrando dados simulados.',
      cacheExpiresAt: expiresAt.toISOString(),
    };

    return NextResponse.json(fallbackData, {
      status: 503,
      headers: {
        'Cache-Control': 'public, s-maxage=300', // 5 min fallback
        'X-Cache-Status': 'error',
      },
    });
  }
}
