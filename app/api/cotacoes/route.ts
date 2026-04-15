import { NextResponse } from 'next/server';
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
 * Estratégia:
 * 1º → API Redação Agro (dados CEPEA reais)
 * 2º → Scraping do HTML da página de cotações
 * 3º → Cache server-side (dados da última busca bem-sucedida)
 * 4º → Mock data estruturada (último recurso)
 *
 * NOTA: Leite não está disponível na API da Redação Agro,
 * então é sempre servido como mock (source: "mock")
 *
 * Headers: Cache-Control: public, s-maxage=7200, stale-while-revalidate=3600
 *          X-Quotes-Source: redacaoagro | redacaoagro-scraping | cache | mock
 */

/**
 * Tipos para a resposta da API Redação Agro
 */
interface RedacaoAgroCommodity {
  nome: string;
  unidade: string;
  praca: string;
  valor: number;
  variacao: number;
  maxima?: number;
  minima?: number;
}

interface RedacaoAgroResponse {
  status: string;
  atualizacao: string;
  fonte: string;
  commodities: Record<string, RedacaoAgroCommodity>;
}

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
 * Gera apenas o quote de Leite (mock)
 * Usado para complementar dados reais da API que não inclui Leite
 */
function generateLeiteQuote(): MarketQuote {
  const now = new Date();
  const hourSeed = now.getHours();
  const dayVariation = Math.sin(hourSeed / 24) * 0.02;

  return {
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
  };
}

/**
 * Timeout padrão para requisições externas
 */
const FETCH_TIMEOUT_MS = 10 * 1000; // 10 segundos

/**
 * Cria um AbortSignal com timeout
 */
function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * 1º Fallback: Busca cotações da API JSON da Redação Agro
 * Endpoint: https://www.redacaoagro.com.br/api/cotacoes.php
 */
async function fetchFromRedacaoAgroAPI(): Promise<MarketQuote[] | null> {
  try {
    const apiUrl = 'https://www.redacaoagro.com.br/api/cotacoes.php';

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GestSilo-Pro/1.0',
        'Accept': 'application/json',
      },
      signal: createTimeoutSignal(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(
        `[cotacoes] API da Redação Agro retornou status ${res.status}`
      );
      return null;
    }

    const data = await res.json() as RedacaoAgroResponse;

    if (data.status !== 'ok' || !data.commodities) {
      console.warn('[cotacoes] API da Redação Agro retornou formato inválido');
      return null;
    }

    const quotes: MarketQuote[] = [];
    const now = new Date().toISOString();

    // Mapear commodities da API para nosso schema
    const commoditiesMap: Record<
      string,
      { symbol: string; name: string; unit: string }
    > = {
      boi_gordo: { symbol: 'BOI', name: 'Boi Gordo (@)', unit: '@' },
      milho: { symbol: 'MILHO', name: 'Milho (sc 60kg)', unit: 'sc' },
      soja: { symbol: 'SOJA', name: 'Soja (sc 60kg)', unit: 'sc' },
    };

    for (const [key, config] of Object.entries(commoditiesMap)) {
      const item = data.commodities[key];

      if (item && typeof item.valor === 'number') {
        const currentPrice = item.valor;
        const variationPercent = item.variacao || 0;
        const previousPrice = variationPercent !== 0
          ? currentPrice / (1 + variationPercent / 100)
          : currentPrice;
        const variation = currentPrice - previousPrice;
        const absVariationPercent = Math.abs(variationPercent);

        quotes.push({
          symbol: config.symbol,
          name: config.name,
          unit: config.unit,
          currentPrice,
          previousPrice: Math.round(previousPrice * 100) / 100,
          variation: Math.round(variation * 100) / 100,
          variationPercent: Math.round(variationPercent * 100) / 100,
          trend:
            absVariationPercent > 0.1
              ? variation > 0
                ? 'up'
                : 'down'
              : 'stable',
          lastUpdate: now,
          source: 'redacaoagro',
          high24h: item.maxima || currentPrice,
          low24h: item.minima || currentPrice,
        });
      }
    }

    // Adicionar Leite (mock) já que não vem da API real
    if (quotes.length > 0) {
      quotes.push(generateLeiteQuote());
      console.warn(`[cotacoes] Sucesso API: ${quotes.length} commodities (incluindo Leite mock)`);
      return quotes;
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[cotacoes] Timeout ao buscar API da Redação Agro');
    } else {
      console.warn('[cotacoes] Erro ao buscar API:', error instanceof Error ? error.message : 'desconhecido');
    }
    return null;
  }
}

/**
 * 2º Fallback: Scraping leve do HTML da página de cotações
 * Usa regex para extrair preços do HTML
 */
async function fetchFromRedacaoAgroScraping(): Promise<MarketQuote[] | null> {
  try {
    const pageUrl = 'https://www.redacaoagro.com.br/ferramentas-cotacoes.php';

    const res = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GestSilo-Pro/1.0',
      },
      signal: createTimeoutSignal(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(
        `[cotacoes] Página de cotações retornou status ${res.status}`
      );
      return null;
    }

    const html = await res.text();

    // Padrões regex para extrair preços
    // Procura por "R$ XXX,XX" ou valores numéricos próximos a nomes de commodities
    const patterns: Record<
      string,
      {
        symbol: string;
        name: string;
        unit: string;
        regex: RegExp;
      }
    > = {
      boi: {
        symbol: 'BOI',
        name: 'Boi Gordo (@)',
        unit: '@',
        // Procura "Boi Gordo" ou "BOI" seguido de preço R$ XXX,XX
        regex: /(?:boi\s+gordo|boi)[^0-9]*[r$\s]*(\d{2,3})[.,](\d{2})/i,
      },
      leite: {
        symbol: 'LEITE',
        name: 'Leite (R$/L)',
        unit: 'L',
        // Procura "Leite" seguido de preço com R$
        regex: /leite[^0-9]*[r$\s]*(\d)[.,](\d{2})/i,
      },
      milho: {
        symbol: 'MILHO',
        name: 'Milho (sc 60kg)',
        unit: 'sc',
        // Procura "Milho" seguido de preço
        regex: /milho[^0-9]*[r$\s]*(\d{2,3})[.,](\d{2})/i,
      },
      soja: {
        symbol: 'SOJA',
        name: 'Soja (sc 60kg)',
        unit: 'sc',
        // Procura "Soja" seguido de preço
        regex: /soja[^0-9]*[r$\s]*(\d{2,3})[.,](\d{2})/i,
      },
    };

    const quotes: MarketQuote[] = [];
    const now = new Date().toISOString();

    for (const [, config] of Object.entries(patterns)) {
      const match = html.match(config.regex);

      if (match) {
        // Reconstruir o preço a partir dos grupos capturados
        const intPart = match[1];
        const decPart = match[2];
        const currentPrice = parseFloat(`${intPart}.${decPart}`);

        // Simular preço anterior com uma pequena variação aleatória (±2%)
        const previousPrice =
          currentPrice / (1 + (Math.random() - 0.5) * 0.04);
        const variation = currentPrice - previousPrice;
        const variationPercent = (variation / previousPrice) * 100;
        const absVariationPercent = Math.abs(variationPercent);

        quotes.push({
          symbol: config.symbol,
          name: config.name,
          unit: config.unit,
          currentPrice,
          previousPrice: Math.round(previousPrice * 100) / 100,
          variation: Math.round(variation * 100) / 100,
          variationPercent: Math.round(variationPercent * 100) / 100,
          trend:
            absVariationPercent > 0.1
              ? variation > 0
                ? 'up'
                : 'down'
              : 'stable',
          lastUpdate: now,
          source: 'redacaoagro-scraping',
          high24h: currentPrice * 1.02,
          low24h: currentPrice * 0.98,
        });
      }
    }

    if (quotes.length > 0) {
      console.warn(
        `[cotacoes] Fallback para scraping: ${quotes.length} commodities extraídas`
      );
      return quotes;
    }

    console.warn('[cotacoes] Scraping não encontrou dados de cotações');
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[cotacoes] Timeout ao fazer scraping da Redação Agro');
    } else {
      console.warn('[cotacoes] Erro ao fazer scraping:', error);
    }
    return null;
  }
}

/**
 * Busca cotações da Redação Agro (CEPEA)
 * Cascata de fallbacks:
 * 1º → API JSON (se disponível)
 * 2º → Scraping leve do HTML
 * 3º → Cache
 * 4º → Mock
 */
async function fetchFromRedacaoAgro(): Promise<{
  quotes: MarketQuote[];
  source: string;
} | null> {
  // 1º Tentar API JSON
  let quotes = await fetchFromRedacaoAgroAPI();
  if (quotes) {
    return { quotes, source: 'redacaoagro' };
  }

  // 2º Tentar scraping
  quotes = await fetchFromRedacaoAgroScraping();
  if (quotes) {
    return { quotes, source: 'redacaoagro-scraping' };
  }

  console.warn(
    '[cotacoes] Fallback para cache/mock: Redação Agro indisponível'
  );
  return null;
}

/**
 * Handler GET
 */
export async function GET() {
  try {
    const now = new Date();

    // 1. Check cache server-side
    if (quotesCache && Date.now() - quotesCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(quotesCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600',
          'X-Cache-Status': 'hit',
          'X-Quotes-Source': quotesCache.data.quotes[0]?.source || 'cache',
        },
      });
    }

    // 2. Tentar Redação Agro
    let quotes: MarketQuote[] | null = null;
    let source: string = 'mock';

    const redacaoAgroResult = await fetchFromRedacaoAgro();
    if (redacaoAgroResult) {
      quotes = redacaoAgroResult.quotes;
      source = redacaoAgroResult.source;
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
          'X-Quotes-Source': 'cache',
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
        'X-Quotes-Source': source,
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
          'X-Quotes-Source': 'cache',
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
        'X-Quotes-Source': 'mock',
      },
    });
  }
}
