'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { MarketQuotesData, MarketQuote } from '@/lib/market';
import {
  formatBRL,
  formatPercent,
  formatDateTime,
} from '@/lib/widget-utils';
import { getCacheItem, setCacheItem, isCacheExpired } from '@/lib/cache-widget';
import { cn } from '@/lib/utils';

/**
 * ──────────────────────────────────────────────────────────────
 * QUOTES WIDGET
 * ──────────────────────────────────────────────────────────────
 *
 * Exibe cotações de mercado agrícola:
 * - Boi Gordo (@)
 * - Leite (R$/L)
 * - Milho (sc 60kg)
 * - Soja (sc 60kg)
 *
 * Features:
 * - Auto-refresh a cada 5 minutos
 * - Cache em localStorage
 * - Indicador de tendência (↑ ↓ →)
 * - Variação em R$ e %
 * - Status online/offline
 */

const COMMODITY_ICONS: Record<string, string> = {
  BOI: '🐄',
  LEITE: '🥛',
  MILHO: '🌽',
  SOJA: '🌾',
};

const COMMODITY_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  BOI: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
  },
  LEITE: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
  },
  MILHO: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
  },
  SOJA: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
  },
};

/**
 * Componente: Card individual de cotação
 */
function QuoteCard({ quote }: { quote: MarketQuote }) {
  const colors = COMMODITY_COLORS[quote.symbol] || COMMODITY_COLORS.MILHO;
  const emoji = COMMODITY_ICONS[quote.symbol] || '📊';

  const trendColor =
    quote.trend === 'up'
      ? 'text-green-600'
      : quote.trend === 'down'
        ? 'text-red-600'
        : 'text-gray-600';

  // Map de ícones estáticos
  const TrendIconComponent =
    quote.trend === 'up'
      ? TrendingUp
      : quote.trend === 'down'
        ? TrendingDown
        : Minus;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        colors.bg,
        colors.border
      )}
    >
      {/* Header: Icon + Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {quote.name}
            </p>
            <p className="text-xs text-gray-600">{quote.unit}</p>
          </div>
        </div>
        <TrendIconComponent className={cn('w-5 h-5', trendColor)} />
      </div>

      {/* Preço atual */}
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">
          {formatBRL(quote.currentPrice)}
        </p>

        {/* Variação */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-semibold',
              quote.variation > 0
                ? 'text-green-600'
                : quote.variation < 0
                  ? 'text-red-600'
                  : 'text-gray-600'
            )}
          >
            {quote.variation > 0 ? '+' : ''}
            {formatBRL(quote.variation)} ({formatPercent(quote.variationPercent)}
            )
          </span>
        </div>
      </div>

      {/* High/Low (opcional) */}
      {quote.high24h && quote.low24h && (
        <div className="pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-600">
          <span>Máx: {formatBRL(quote.high24h)}</span>
          <span>Mín: {formatBRL(quote.low24h)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Componente principal: QuotesWidget
 */
export function QuotesWidget() {
  const [data, setData] = useState<MarketQuotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = 'quotes-market';

  /**
   * Fetch cotações
   */
  const fetchQuotes = useCallback(async () => {
    try {
      setError(null);

      const res = await fetch(`/api/cotacoes`, {
        next: { revalidate: 300 }, // 5 minutos
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const quotesData: MarketQuotesData = await res.json();

      // Validar dados
      if (quotesData.quotes.length === 0) {
        throw new Error('Nenhuma cotação disponível');
      }

      // Salvar em cache
      setCacheItem(cacheKey, quotesData, 5); // 5 minutos TTL

      setData(quotesData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao buscar cotações';

      // Tentar recuperar do cache
      const cached = getCacheItem<MarketQuotesData>(cacheKey);
      if (cached) {
        setData({ ...cached, isOffline: true });
        setError('Mostrando dados em cache');
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Carregar ao montar
   */
  useEffect(() => {
    // Tentar carregar do cache primeiro
    if (!data) {
      const cached = getCacheItem<MarketQuotesData>(cacheKey);
      if (cached && !isCacheExpired(cached.cacheExpiresAt)) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    fetchQuotes();
  }, [fetchQuotes, data]);

  /**
   * Auto-refresh a cada 5 minutos
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchQuotes();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [fetchQuotes]);

  // Loading
  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Cotações de Mercado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Erro sem dados
  if (error && !data) {
    return (
      <Card className="rounded-2xl shadow-sm border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-red-900">
            Cotações Indisponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-800">
          <p className="mb-3">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchQuotes();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-semibold">
            Cotações de Mercado
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Atualizado {formatDateTime(data.fetchedAt)}
            {data.isOffline && ' (offline)'}
            {!data.isAvailable && ' (erro)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!data.isAvailable && (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRefreshing(true);
              fetchQuotes();
            }}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={cn('w-4 h-4', refreshing && 'animate-spin')}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Grid de cotações */}
        <div className="grid gap-3">
          {data.quotes.map((quote) => (
            <QuoteCard key={quote.symbol} quote={quote} />
          ))}
        </div>

        {/* Info de fonte */}
        {data.quotes.length > 0 && (
          <div className="pt-3 border-t border-gray-200 text-xs text-muted-foreground text-center">
            Fonte:{' '}
            {data.quotes[0].source === 'mock'
              ? 'Simulado'
              : data.quotes[0].source === 'redacaoagro'
                ? 'Redação Agro (CEPEA)'
                : 'Cache'}
          </div>
        )}

        {/* Mensagem de fallback */}
        {data.errorMessage && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">{data.errorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
