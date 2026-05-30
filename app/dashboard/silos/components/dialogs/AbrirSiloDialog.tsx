'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { abrirSiloAction } from '@/app/dashboard/silos/actions';

interface AbrirSiloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  siloNome: string;
  dataAberturaMinima?: string;
  onSuccess: () => void;
}

export function AbrirSiloDialog({
  open,
  onOpenChange,
  siloId,
  siloNome,
  dataAberturaMinima,
  onSuccess,
}: AbrirSiloDialogProps) {
  const hoje = new Date().toISOString().split('T')[0];
  const [data, setData] = useState(hoje);
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) {
      toast.error('Informe a data de abertura');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await abrirSiloAction(siloId, data, observacoes || undefined);
      if (!result.success) {
        toast.error(result.error ?? 'Erro ao registrar abertura');
        return;
      }
      toast.success(`Silo "${siloNome}" marcado como aberto!`);
      onOpenChange(false);
      setData(hoje);
      setObservacoes('');
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Abertura do Silo</DialogTitle>
          <DialogDescription>
            Informe a data em que o silo <strong>{siloNome}</strong> foi aberto.
            O status passará de <em>Fechado</em> para <em>Aberto</em>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="data-abertura">
              Data de Abertura <span className="text-destructive">*</span>
            </Label>
            <Input
              id="data-abertura"
              type="date"
              value={data}
              max={hoje}
              min={dataAberturaMinima}
              onChange={(e) => setData(e.target.value)}
              aria-required="true"
            />
            {dataAberturaMinima && (
              <p className="text-xs text-muted-foreground">
                Abertura prevista: {new Date(dataAberturaMinima + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-abertura">Observações</Label>
            <Textarea
              id="obs-abertura"
              placeholder="Ex: Silagem com boa qualidade visual, sem odor indesejado..."
              maxLength={500}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Confirmar Abertura'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
