'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deletarInsumoAction } from '../actions';

interface DeleteInsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumoId?: string;
  onSuccess?: () => void;
}

export default function DeleteInsumoDialog({
  open,
  onOpenChange,
  insumoId,
  onSuccess,
}: DeleteInsumoDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!insumoId) return;

    setDeleting(true);
    try {
      await deletarInsumoAction(insumoId);
      toast.success('Insumo deletado com sucesso');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar insumo');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deletar Insumo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja deletar este insumo? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deletando...' : 'Deletar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
