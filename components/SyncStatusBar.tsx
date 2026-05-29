'use client';

import { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getSyncConflitos } from '@/lib/db/syncQueue';
import type { EventoReprodutivoLocal } from '@/lib/db/eventosRebanho';
import { ConflictResolutionModal } from '@/components/offline/ConflictResolutionModal';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SyncStatusBar() {
  const { isOnline, pendentes, isSyncing } = useOfflineSync();
  const [conflitos, setConflitos] = useState<EventoReprodutivoLocal[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    async function checkConflitos() {
      const result = await getSyncConflitos();
      setConflitos(result as EventoReprodutivoLocal[]);
    }
    checkConflitos();
    const interval = setInterval(checkConflitos, 10000);
    return () => clearInterval(interval);
  }, []);

  function handleResolve(id: string) {
    setConflitos((prev) => prev.filter((c) => c.id !== id));
  }

  const shouldShow = !isOnline || pendentes > 0 || isSyncing || conflitos.length > 0;

  if (!shouldShow) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md
            ${!isOnline
              ? 'bg-destructive/90 border-white/20 text-white'
              : isSyncing
                ? 'bg-secondary/90 border-white/20 text-white'
                : 'bg-primary/90 border-white/20 text-white'
            }
          `}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-5 h-5 animate-pulse" />
              <span className="font-bold text-sm">
                Sem conexão — {pendentes} {pendentes === 1 ? 'ação pendente' : 'ações pendentes'}
              </span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-bold text-sm">Sincronizando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold text-sm">
                {pendentes} {pendentes === 1 ? 'ação pendente' : 'ações pendentes'} para sincronizar
              </span>
            </>
          )}

          {conflitos.length > 0 && (
            <button
              onClick={() => setModalAberto(true)}
              className="ml-2 flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg px-2 py-0.5 text-xs font-bold transition-colors"
              aria-label={`${conflitos.length} conflito(s) — clique para resolver`}
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              {conflitos.length} conflito{conflitos.length > 1 ? 's' : ''}
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {modalAberto && (
        <ConflictResolutionModal
          conflitos={conflitos}
          onResolve={handleResolve}
          onClose={() => setModalAberto(false)}
        />
      )}
    </>
  );
}
