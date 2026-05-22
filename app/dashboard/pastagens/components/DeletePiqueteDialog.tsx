'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { deletarPiqueteAction } from '../actions';

interface DeletePiqueteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piqueteId: string;
  piqueteNome: string;
  onSuccess: () => void;
}

export function DeletePiqueteDialog({
  open,
  onOpenChange,
  piqueteId,
  piqueteNome,
  onSuccess,
}: DeletePiqueteDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deletarPiqueteAction(piqueteId);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Piquete excluído.');
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="h-4 w-4" />
            Excluir piquete
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong className="text-foreground">{piqueteNome}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-lg p-3 flex items-start gap-2"
          style={{ background: 'rgba(224,84,84,0.08)', border: '1px solid rgba(224,84,84,0.2)' }}
        >
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">
            O histórico de ocupações e eventos de manejo deste piquete também serão excluídos. Esta ação não pode ser desfeita.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {loading ? 'Excluindo...' : 'Excluir piquete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
