'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DialogEditarNomeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeAtual: string;
  onConfirm: (novoNome: string) => Promise<void>;
  isUpdating: boolean;
}

export function DialogEditarNome({
  open,
  onOpenChange,
  nomeAtual,
  onConfirm,
  isUpdating,
}: DialogEditarNomeProps) {
  const [novoNome, setNovoNome] = useState(nomeAtual);
  const [erro, setErro] = useState('');

  const handleConfirm = async () => {
    if (!novoNome.trim()) {
      setErro('Nome não pode estar vazio');
      return;
    }
    setErro('');
    await onConfirm(novoNome.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar nome do planejamento</DialogTitle>
          <DialogDescription>
            Digite um novo nome para este planejamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="novo-nome">Nome</Label>
            <Input
              id="novo-nome"
              placeholder="ex: Rebanho Leiteiro 2026-06"
              value={novoNome}
              onChange={(e) => {
                setNovoNome(e.target.value);
                setErro('');
              }}
              disabled={isUpdating}
            />
            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!novoNome.trim() || isUpdating}
          >
            {isUpdating ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
