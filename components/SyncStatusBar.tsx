'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SyncStatusBar() {
  const { isOnline, pendentes, isSyncing } = useOfflineSync();

  // Só mostra se estiver offline ou com sincronização pendente
  const shouldShow = !isOnline || pendentes > 0 || isSyncing;

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md
          ${!isOnline
            ? 'bg-red-500/90 border-white/20 text-white'
            : isSyncing
              ? 'bg-amber-500/90 border-white/20 text-white'
              : 'bg-green-500/90 border-white/20 text-white'
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
      </motion.div>
    </AnimatePresence>
  );
}
