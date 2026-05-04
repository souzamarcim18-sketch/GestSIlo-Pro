'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSyncStatus } from '@/lib/db/syncQueue';
import { useSyncContext } from './ReproducaoSyncProvider';

export function SyncStatusBadge() {
  const [pendentes, setPendentes] = useState(0);
  const { isSyncing, syncNow } = useSyncContext();

  useEffect(() => {
    const verificar = async () => {
      const status = await getSyncStatus();
      setPendentes(status.pendentes);
    };

    verificar();

    const interval = setInterval(verificar, 3000);
    return () => clearInterval(interval);
  }, []);

  if (pendentes === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive" className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700">
        <WifiOff className="h-3 w-3" />
        <span>{pendentes} pendente{pendentes > 1 ? 's' : ''}</span>
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        onClick={syncNow}
        disabled={isSyncing}
        className="h-8 w-8 p-0"
        title="Sincronizar agora"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
