'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncOnReconnect } from '@/lib/hooks/useSyncOnReconnect';
import { getSyncConflitos } from '@/lib/db/syncQueue';
import { ConflictResolutionDialog, type ConflictoSync } from './ConflictResolutionDialog';
import { useAuth } from '@/providers/AuthProvider';
import { getDb } from '@/lib/db/localDb';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function ReproducaoSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSyncing, lastSyncAt, syncNow } = useSyncOnReconnect();
  const { profile } = useAuth();
  const [conflitos, setConflitos] = useState<ConflictoSync[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAdmin = profile?.perfil === 'Administrador';

  // Chamar verificarConflitos quando a sincronização terminar
  useEffect(() => {
    const verificarConflitos = async () => {
      try {
        const conflictosData = await getSyncConflitos();
        if (conflictosData && conflictosData.length > 0) {
          setConflitos(conflictosData);

          const toastId = toast(
            `${conflictosData.length} conflito${conflictosData.length > 1 ? 's' : ''} de sincronização`,
            {
              action: {
                label: 'Resolver',
                onClick: () => {
                  setIsDialogOpen(true);
                  toast.dismiss(toastId);
                },
              },
              description: 'Alguns eventos não puderam ser sincronizados',
            }
          );
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[ReproducaoSyncProvider] Erro ao verificar conflitos:', err);
        }
      }
    };

    // Apenas verificar se mudou o lastSyncAt
    if (lastSyncAt) {
      verificarConflitos();
    }
  }, [lastSyncAt]);

  const handleResolverConflito = useCallback(
    async (id: string, acao: 'descartar' | 'forcar') => {
      const db = await getDb();
      if (!db) {
        toast.error('IndexedDB não disponível');
        return;
      }

      try {
        const eventosStore = db.transaction('eventos_rebanho', 'readwrite').store;

        if (acao === 'descartar') {
          // Remove o evento do IndexedDB
          await eventosStore.delete(id);
          toast.success('Evento descartado');
        } else if (acao === 'forcar' && isAdmin) {
          // Apenas marca como pending novamente para tentar sync
          const evento = await eventosStore.get(id);
          if (evento) {
            evento._sync_status = 'pending';
            delete evento._conflict_motivo;
            await eventosStore.put(evento);
            toast.success('Evento marcado para sincronização. Tentando novamente...');
            // Tentar sincronizar imediatamente
            setTimeout(() => syncNow(), 500);
          }
        }

        // Remover da lista de conflitos
        setConflitos((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        toast.error('Erro ao resolver conflito');
        if (process.env.NODE_ENV === 'development') {
          console.error('[ReproducaoSyncProvider] Erro ao resolver conflito:', err);
        }
      }
    },
    [isAdmin, syncNow]
  );

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncAt, syncNow }}>
      <>
        {children}
        <ConflictResolutionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          conflitos={conflitos}
          isAdmin={isAdmin}
          onResolver={handleResolverConflito}
        />
      </>
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
