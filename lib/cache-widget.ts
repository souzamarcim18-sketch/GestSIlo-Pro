'use client';

/**
 * ──────────────────────────────────────────────────────────────
 * CLIENT-SIDE CACHE: localStorage com TTL
 * ──────────────────────────────────────────────────────────────
 *
 * ⚠️ IMPORTANTE: Este módulo é EXCLUSIVAMENTE para uso client-side
 * Para cache server-side, use Map em memória ou Redis (conforme Correção 2)
 *
 * Prefixo de cache: "gestsilo-widget-" (Correção 3)
 */

const CACHE_PREFIX = 'gestsilo-widget-';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number; // timestamp em ms
}

/**
 * Salva dados em localStorage com TTL
 * @param key Chave sem prefixo (será adicionado automaticamente)
 * @param value Dados a cachear (deve ser serializável a JSON)
 * @param ttlMinutes Tempo de vida em minutos
 */
export function setCacheItem<T>(key: string, value: T, ttlMinutes: number): void {
  try {
    if (typeof window === 'undefined') {
      console.warn('[cache-widget] localStorage não disponível (server-side)');
      return;
    }

    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    const entry: CacheEntry<T> = {
      data: value,
      expiresAt,
    };

    const prefixedKey = `${CACHE_PREFIX}${key}`;
    window.localStorage.setItem(prefixedKey, JSON.stringify(entry));
  } catch (error) {
    console.error('[cache-widget] Erro ao salvar em cache:', error);
  }
}

/**
 * Recupera dados do localStorage se ainda estiverem válidos
 * @param key Chave sem prefixo
 * @returns Dados ou null se expirados/não encontrados
 */
export function getCacheItem<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const prefixedKey = `${CACHE_PREFIX}${key}`;
    const raw = window.localStorage.getItem(prefixedKey);

    if (!raw) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      window.localStorage.removeItem(prefixedKey);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('[cache-widget] Erro ao recuperar do cache:', error);
    return null;
  }
}

/**
 * Remove uma chave do cache
 * @param key Chave sem prefixo
 */
export function clearCacheItem(key: string): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const prefixedKey = `${CACHE_PREFIX}${key}`;
    window.localStorage.removeItem(prefixedKey);
  } catch (error) {
    console.error('[cache-widget] Erro ao limpar cache:', error);
  }
}

/**
 * Verifica se uma data de expiração já passou
 * @param expiresAt ISO timestamp ou número (ms)
 * @returns true se expirou
 */
export function isCacheExpired(expiresAt: string | number): boolean {
  try {
    const expiresMs =
      typeof expiresAt === 'string'
        ? new Date(expiresAt).getTime()
        : expiresAt;

    return Date.now() > expiresMs;
  } catch (error) {
    console.error('[cache-widget] Erro ao verificar expiração:', error);
    return true; // Por segurança, considerar como expirado
  }
}

/**
 * Limpa todos os items de cache do widget
 */
export function clearAllWidgetCache(): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[cache-widget] Erro ao limpar todos os caches:', error);
  }
}

/**
 * Retorna o tempo restante de um cache (em ms)
 * @param key Chave sem prefixo
 * @returns Tempo em ms ou -1 se não encontrado/expirado
 */
export function getCacheTimeRemaining(key: string): number {
  try {
    if (typeof window === 'undefined') {
      return -1;
    }

    const prefixedKey = `${CACHE_PREFIX}${key}`;
    const raw = window.localStorage.getItem(prefixedKey);

    if (!raw) {
      return -1;
    }

    const entry: CacheEntry<unknown> = JSON.parse(raw);
    const remaining = entry.expiresAt - Date.now();

    return remaining > 0 ? remaining : -1;
  } catch (error) {
    console.error('[cache-widget] Erro ao obter tempo restante:', error);
    return -1;
  }
}
