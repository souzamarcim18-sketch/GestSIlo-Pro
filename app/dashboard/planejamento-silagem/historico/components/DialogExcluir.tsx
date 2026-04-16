'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DialogExcluirProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DialogExcluir({
  open,
  onOpenChange,
  nome,
  onConfirm,
  isDeleting,
}: DialogExcluirProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deletar planejamento?</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja deletar &quot;{nome}&quot;? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deletando...' : 'Deletar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
