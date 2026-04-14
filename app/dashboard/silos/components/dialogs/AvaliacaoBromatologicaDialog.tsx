'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { toast } from 'sonner';

const bromatologicaSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  momento: z.string().min(1, 'Momento é obrigatório'),
  avaliador: z.string().min(1, 'Avaliador é obrigatório'),
  pb: z.number().min(0, 'PB deve ser >= 0').max(100, 'PB deve ser <= 100'),
  fd: z.number().min(0, 'FD deve ser >= 0').max(100, 'FD deve ser <= 100'),
  fda: z.number().min(0, 'FDA deve ser >= 0').max(100, 'FDA deve ser <= 100'),
  energia: z.number().min(0, 'Energia deve ser >= 0'),
  umidade: z.number().min(0, 'Umidade deve ser >= 0').max(100, 'Umidade deve ser <= 100'),
});

type BromatologicaFormData = z.infer<typeof bromatologicaSchema>;

interface AvaliacaoBromatologicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  onSuccess: () => void;
}

export function AvaliacaoBromatologicaDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: AvaliacaoBromatologicaDialogProps) {
  const form = useForm<BromatologicaFormData>({
    resolver: zodResolver(bromatologicaSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      momento: 'Manhã',
      avaliador: '',
      pb: 0,
      fd: 0,
      fda: 0,
      energia: 0,
      umidade: 0,
    },
  });

  const handleSubmit = async (data: BromatologicaFormData) => {
    try {
      // TODO: Implementar salvamento em banco de dados
      // Por enquanto, apenas mostrar sucesso
      toast.success('Análise bromatológica registrada!');
      form.reset({
        data: new Date().toISOString().split('T')[0],
        momento: 'Manhã',
        avaliador: '',
        pb: 0,
        fd: 0,
        fda: 0,
        energia: 0,
        umidade: 0,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar análise');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Análise Bromatológica</DialogTitle>
          <DialogDescription>
            Registre a composição química e nutritiva da silagem.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Data e Momento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-data">Data</Label>
              <Input
                id="brom-data"
                type="date"
                {...form.register('data')}
              />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-momento">Momento</Label>
              <Input
                id="brom-momento"
                placeholder="Ex: Manhã, Tarde"
                {...form.register('momento')}
              />
              {form.formState.errors.momento && (
                <p className="text-xs text-destructive">{form.formState.errors.momento.message}</p>
              )}
            </div>
          </div>

          {/* Avaliador */}
          <div className="space-y-2">
            <Label htmlFor="brom-avaliador">Avaliador</Label>
            <Input
              id="brom-avaliador"
              {...form.register('avaliador')}
            />
            {form.formState.errors.avaliador && (
              <p className="text-xs text-destructive">{form.formState.errors.avaliador.message}</p>
            )}
          </div>

          {/* PB, FD, FDA, Energia, Umidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-pb">PB (%)</Label>
              <Input
                id="brom-pb"
                type="number"
                step="0.1"
                {...form.register('pb', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-fd">FD (%)</Label>
              <Input
                id="brom-fd"
                type="number"
                step="0.1"
                {...form.register('fd', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-fda">FDA (%)</Label>
              <Input
                id="brom-fda"
                type="number"
                step="0.1"
                {...form.register('fda', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-energia">Energia (Mcal/kg)</Label>
              <Input
                id="brom-energia"
                type="number"
                step="0.01"
                {...form.register('energia', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brom-umidade">Umidade (%)</Label>
            <Input
              id="brom-umidade"
              type="number"
              step="0.1"
              {...form.register('umidade', { valueAsNumber: true })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
