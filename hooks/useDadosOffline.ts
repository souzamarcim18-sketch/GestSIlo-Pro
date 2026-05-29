'use client';

import { useState, useEffect } from 'react';
import { getDb } from '@/lib/db/localDb';
import type { TableName } from '@/lib/db/syncQueue';

export function useDadosOffline(store: TableName) {
  const [dados, setDados] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const db = await getDb();
        if (!db) return;
        const result = await db.getAll(store as Parameters<typeof db.getAll>[0]);
        setDados(result as Record<string, unknown>[]);
      } catch {
        // IndexedDB pode não estar disponível — ignorar silenciosamente
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [store]);

  return { dados, isLoading };
}
