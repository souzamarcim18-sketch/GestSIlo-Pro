'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { excluirPlanejamentoAction } from '@/app/dashboard/planejamento-compras/actions';

interface DeletePlanejamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planejamentoId?: string;
  descricao?: string;
  onSuccess?: () => void;
}

export default function DeletePlanejamentoDialog({
  open,
  onOpenChange,
  planejamentoId,
  descricao,
  onSuccess,
}: DeletePlanejamentoDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!planejamentoId) return;
    setDeleting(true);
    const result = await excluirPlanejamentoAction(planejamentoId);
    setDeleting(false);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Atividade excluída com sucesso');
      onOpenChange(false);
      onSuccess?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Atividade Planejada</DialogTitle>
          <DialogDescription>
            {descricao
              ? `Tem certeza que deseja excluir "${descricao}"?`
              : 'Tem certeza que deseja excluir esta atividade?'}
            {' '}Os insumos vinculados também serão removidos. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
