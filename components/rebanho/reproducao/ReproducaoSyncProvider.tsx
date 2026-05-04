'use client';

import { createContext, useContext } from 'react';
import { useSyncOnReconnect } from '@/lib/hooks/useSyncOnReconnect';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function ReproducaoSyncProvider({ children }: { children: React.ReactNode }) {
  const syncResult = useSyncOnReconnect();

  return (
    <SyncContext.Provider value={syncResult}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext deve ser usado dentro de ReproducaoSyncProvider');
  }
  return context;
}
