'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Trash2, SendHorizonal, CheckCircle2 } from 'lucide-react';
import { getSyncConflitos } from '@/lib/db/syncQueue';
import { deleteEventoLocal } from '@/lib/db/eventosRebanho';
import type { EventoReprodutivoLocal } from '@/lib/db/eventosRebanho';
import { getDb } from '@/lib/db/localDb';
import { supabase } from '@/lib/supabase';
import { syncAll } from '@/lib/db/syncQueue';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const TIPO_LABELS: Record<string, string> = {
  cobertura: 'Cobertura',
  diagnostico: 'Diagnóstico de Prenhez',
  parto: 'Parto',
  desmame: 'Desmame',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
};

const CONFLITO_LABELS: Record<string, string> = {
  animal_morto: 'Animal marcado como Morto',
  animal_vendido: 'Animal marcado como Vendido',
};

export default function SincronizacaoPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const { pendentes, isSyncing, handleSync } = useOfflineSync();
  const [conflitos, setConflitos] = useState<EventoReprodutivoLocal[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile?.perfil !== 'Administrador') {
      router.replace('/dashboard');
    }
  }, [profile, loading, router]);

  const carregarConflitos = useCallback(async () => {
    const result = await getSyncConflitos();
    setConflitos(result as EventoReprodutivoLocal[]);
  }, []);

  useEffect(() => {
    carregarConflitos();
  }, [carregarConflitos]);

  async function handleDescartar(id: string) {
    setLoadingId(id);
    try {
      await deleteEventoLocal(id);
      const db = await getDb();
      if (db) {
        const tx = db.transaction('sync_queue', 'readwrite');
        const all = await tx.store.getAll();
        for (const item of all) {
          if ((item.payload as Record<string, unknown>)?.id === id) {
            await tx.store.delete(item.id!);
          }
        }
        await tx.done;
      }
      toast.success('Evento descartado.');
      setConflitos((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error('Erro ao descartar evento.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleForcar(evento: EventoReprodutivoLocal) {
    setLoadingId(evento.id);
    try {
      const rpcName = `registrar_${evento.tipo_evento}`;
      const { error } = await supabase.rpc(rpcName, evento.payload);
      if (error) throw error;
      await deleteEventoLocal(evento.id);
      toast.success('Evento enviado com sucesso.');
      setConflitos((prev) => prev.filter((c) => c.id !== evento.id));
    } catch {
      toast.error('Erro ao forçar envio. Verifique a conexão.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSyncManual() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    await handleSync();
    await carregarConflitos();
  }

  if (loading || profile?.perfil !== 'Administrador') return null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sincronização Offline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie conflitos de sincronização e force o envio de dados pendentes.
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status atual</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">{pendentes}</span>{' '}
              {pendentes === 1 ? 'ação pendente' : 'ações pendentes'} na fila
            </p>
            <p className="text-sm">
              <span className="font-medium">{conflitos.length}</span>{' '}
              {conflitos.length === 1 ? 'conflito' : 'conflitos'} aguardando resolução
            </p>
          </div>
          <Button
            onClick={handleSyncManual}
            disabled={isSyncing}
            className="gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
          </Button>
        </CardContent>
      </Card>

      {/* Conflitos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
            Conflitos pendentes
          </CardTitle>
          <CardDescription>
            Eventos locais que não puderam ser sincronizados por conflito com o estado atual do animal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conflitos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum conflito pendente.
            </p>
          ) : (
            conflitos.map((conflito) => (
              <div
                key={conflito.id}
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {TIPO_LABELS[conflito.tipo_evento] ?? conflito.tipo_evento}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Data: {new Date(conflito.data_evento).toLocaleDateString('pt-BR')}
                  </p>
                  {conflito._conflict_motivo && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      {CONFLITO_LABELS[conflito._conflict_motivo] ?? conflito._conflict_motivo}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={loadingId === conflito.id}
                    onClick={() => handleDescartar(conflito.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={loadingId === conflito.id}
                    onClick={() => handleForcar(conflito)}
                  >
                    <SendHorizonal className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Forçar envio
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
