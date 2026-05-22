'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deletarAtividadeAction } from '../actions';
import { formatDate, formatBRL } from '@/lib/utils';
import type { AtividadeComColaboradores } from '@/lib/types/mao-de-obra';

interface DeleteAtividadeDialogProps {
  atividade: AtividadeComColaboradores;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAtividadeDialog({
  atividade,
  isOpen,
  onClose,
  onSuccess,
}: DeleteAtividadeDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await deletarAtividadeAction(atividade.id);
    setLoading(false);

    if (result.success) {
      toast.success('Atividade excluída.');
      onSuccess();
    } else {
      toast.error(result.error);
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            Excluir atividade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-foreground">
            Excluir atividade de{' '}
            <span className="font-semibold">{formatDate(atividade.data)}</span>
            {' — '}
            <span className="font-semibold">{atividade.tipo_atividade}</span>
            {' '}({formatBRL(atividade.custo_final)})?
          </p>
          {atividade.despesa_id && (
            <div
              className="rounded-lg p-3 text-xs text-yellow-300"
              style={{ background: 'rgba(245,208,0,0.06)', border: '1px solid rgba(245,208,0,0.2)' }}
            >
              Esta atividade possui uma despesa vinculada no módulo Financeiro. A despesa também será <strong>removida</strong>.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-700 hover:bg-red-800 text-white font-semibold"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
