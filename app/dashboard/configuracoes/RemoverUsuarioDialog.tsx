'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { removerUsuarioAction } from './actions';

interface RemoverUsuarioDialogProps {
  userId: string;
  userName: string;
}

export function RemoverUsuarioDialog({ userId, userName }: RemoverUsuarioDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleRemover() {
    setIsLoading(true);
    const result = await removerUsuarioAction(userId);
    setIsLoading(false);

    if (result.success) {
      toast.success(`Acesso de ${userName} removido com sucesso.`);
    } else {
      toast.error(result.error ?? 'Erro ao remover usuário.');
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={`Remover acesso de ${userName}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover acesso de {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá excluir permanentemente a conta de <strong>{userName}</strong> do sistema,
            incluindo todos os dados de acesso. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemover}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Removendo...' : 'Sim, remover acesso'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
