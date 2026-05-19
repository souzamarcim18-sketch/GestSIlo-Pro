'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deletarProdutoAction } from '../actions';

interface DeleteProdutoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoId?: string;
  produtoNome?: string;
  onSuccess?: () => void;
}

export default function DeleteProdutoDialog({
  open,
  onOpenChange,
  produtoId,
  produtoNome,
  onSuccess,
}: DeleteProdutoDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!produtoId) return;
    setDeleting(true);
    try {
      await deletarProdutoAction(produtoId);
      toast.success('Produto removido com sucesso');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar produto');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover Produto</DialogTitle>
          <DialogDescription>
            {produtoNome
              ? `Tem certeza que deseja remover "${produtoNome}"?`
              : 'Tem certeza que deseja remover este produto?'}
            {' '}Produtos com histórico de movimentações serão apenas desativados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
