'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { syncAll, getSyncStatus } from '@/lib/db/syncQueue';
import { toast } from 'sonner';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateStatus = useCallback(async () => {
    const status = await getSyncStatus();
    setPendentes(status.pendentes);
  }, []);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncAll(supabase);
      await updateStatus();
    } catch (error) {
      console.error('[useOfflineSync] Erro na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Conexão restaurada. Sincronizando dados pendentes...');
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Você está offline. As alterações serão salvas localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Polling opcional para garantir que o contador de pendentes esteja atualizado
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [handleSync, updateStatus]);

  return { isOnline, pendentes, isSyncing, handleSync, updateStatus };
}
