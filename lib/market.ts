import { z } from 'zod';

/**
 * ──────────────────────────────────────────────────────────────
 * TYPES: Market Quotes Widget
 * ──────────────────────────────────────────────────────────────
 */

export type MarketQuote = {
  symbol: string;                // "BOI", "LEITE", "MILHO", "SOJA"
  name: string;                  // "Boi Gordo", "Leite (R$/L)", etc
  unit: string;                  // "kg", "L", "sc", "@"
  currentPrice: number;          // em R$
  previousPrice: number;         // preço anterior (para cálculo variação)
  variation: number;             // R$ (currentPrice - previousPrice)
  variationPercent: number;      // % ((currentPrice-prev)/prev * 100)
  trend: 'up' | 'down' | 'stable';  // determinado por variationPercent
  lastUpdate: string;            // ISO timestamp
  source: string;                // "mock" | "redacaoagro" | "cache"
  high24h?: number;              // máxima das últimas 24h
  low24h?: number;               // mínima das últimas 24h
};

export type MarketQuotesData = {
  quotes: MarketQuote[];
  lastUpdate: string;            // ISO timestamp
  fetchedAt: string;             // ISO timestamp do fetch local
  isOffline: boolean;            // true se servido de cache
  isAvailable: boolean;          // false se API falhou
  errorMessage?: string;         // motivo de falha (se houver)
  cacheExpiresAt: string;        // ISO timestamp when cache expires
};

/**
 * ──────────────────────────────────────────────────────────────
 * ZOD SCHEMAS: Validação
 * ──────────────────────────────────────────────────────────────
 */

export const marketQuoteSchema = z.object({
  symbol: z.enum(['BOI', 'LEITE', 'MILHO', 'SOJA']),
  name: z.string(),
  unit: z.string(),
  currentPrice: z.number().nonnegative(),
  previousPrice: z.number().nonnegative(),
  variation: z.number(),
  variationPercent: z.number(),
  trend: z.enum(['up', 'down', 'stable']),
  lastUpdate: z.string().datetime(),
  source: z.string(),
  high24h: z.number().nonnegative().optional(),
  low24h: z.number().nonnegative().optional(),
});

export const marketQuotesDataSchema = z.object({
  quotes: z.array(marketQuoteSchema).min(1),
  lastUpdate: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  isOffline: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  errorMessage: z.string().optional(),
  cacheExpiresAt: z.string().datetime(),
});
