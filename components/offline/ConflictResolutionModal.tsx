'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, SendHorizonal } from 'lucide-react';
import type { EventoReprodutivoLocal } from '@/lib/db/eventosRebanho';
import { deleteEventoLocal } from '@/lib/db/eventosRebanho';
import { getDb } from '@/lib/db/localDb';
import { supabase } from '@/lib/supabase';

interface Props {
  conflitos: EventoReprodutivoLocal[];
  onResolve: (id: string, acao: 'descartar' | 'forcar') => void;
  onClose: () => void;
}

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

export function ConflictResolutionModal({ conflitos, onResolve, onClose }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDescartar(id: string) {
    setLoadingId(id);
    try {
      await deleteEventoLocal(id);
      // Remover também da sync_queue se ainda estiver lá
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
      onResolve(id, 'descartar');
    } catch {
      toast.error('Erro ao descartar evento.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleForcar(evento: EventoReprodutivoLocal) {
    setLoadingId(evento.id);
    try {
      // Tenta enviar o RPC sem verificação de conflito
      const rpcName = `registrar_${evento.tipo_evento}`;
      const { error } = await supabase.rpc(rpcName, evento.payload);
      if (error) throw error;

      await deleteEventoLocal(evento.id);
      toast.success('Evento enviado com sucesso.');
      onResolve(evento.id, 'forcar');
    } catch {
      toast.error('Erro ao forçar envio. Verifique a conexão.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            Conflitos de sincronização
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {conflitos.map((conflito) => (
            <div
              key={conflito.id}
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
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
          ))}

          {conflitos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum conflito pendente.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
