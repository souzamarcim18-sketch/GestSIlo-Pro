'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useOnlineStatus } from './useOnlineStatus';
import { syncAll } from '@/lib/db/syncQueue';
import { getSupabaseClient } from '@/lib/supabase';

interface UseSyncOnReconnectResult {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
}

export function useSyncOnReconnect(): UseSyncOnReconnectResult {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);
  const isSyncing = useRef(false);
  const retryCount = useRef(0);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isSyncingState, setIsSyncingState] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const performSync = useCallback(async () => {
    if (isSyncing.current) return;

    isSyncing.current = true;
    setIsSyncingState(true);

    try {
      const supabase = getSupabaseClient();
      await syncAll(supabase);

      setLastSyncAt(new Date());
      retryCount.current = 0;
      toast.success('Sincronização concluída');

      if (process.env.NODE_ENV === 'development') {
        console.log('[useSyncOnReconnect] Sync concluído com sucesso');
      }
    } catch (err) {
      retryCount.current += 1;

      if (process.env.NODE_ENV === 'development') {
        console.error('[useSyncOnReconnect] Erro na sincronização:', err);
      }

      if (retryCount.current < 5) {
        const delayMs = Math.pow(2, retryCount.current - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
        toast.error(`Falha ao sincronizar. Tentando novamente em ${delayMs / 1000}s...`);

        if (retryTimeout.current) clearTimeout(retryTimeout.current);
        retryTimeout.current = setTimeout(() => {
          isSyncing.current = false;
          performSync();
        }, delayMs);
      } else {
        toast.error('Falha ao sincronizar. Tentando novamente em breve.');
        if (process.env.NODE_ENV === 'development') {
          console.error('[useSyncOnReconnect] Máximo de tentativas atingido');
        }
      }
    } finally {
      if (!retryTimeout.current) {
        isSyncing.current = false;
        setIsSyncingState(false);
      }
    }
  }, []);

  // Detecta transição offline → online
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current && !isSyncing.current) {
      wasOffline.current = false;
      performSync();
    }
  }, [isOnline, performSync]);

  // Listener de visibilitychange (PWA voltando do background)
  useEffect(() => {
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine &&
        !isSyncing.current
      ) {
        performSync();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, [performSync]);

  return {
    isSyncing: isSyncingState,
    lastSyncAt,
    syncNow: performSync,
  };
}
