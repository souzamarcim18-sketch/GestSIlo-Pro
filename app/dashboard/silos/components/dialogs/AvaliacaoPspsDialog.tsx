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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Controller, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

const pspsSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  peneira1: z.number().min(0).max(100, 'Peneira 1 deve estar entre 0 e 100'),
  peneira2: z.number().min(0).max(100, 'Peneira 2 deve estar entre 0 e 100'),
  peneira3: z.number().min(0).max(100, 'Peneira 3 deve estar entre 0 e 100'),
  peneira4: z.number().min(0).max(100, 'Fundo deve estar entre 0 e 100'),
  tmp: z.number().min(0, 'TMP deve ser >= 0'),
  status: z.enum(['Ideal', 'Bom', 'Ruim']),
});

type PspsFormData = z.infer<typeof pspsSchema>;

interface AvaliacaoPspsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  onSuccess: () => void;
}

export function AvaliacaoPspsDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: AvaliacaoPspsDialogProps) {
  const form = useForm<PspsFormData>({
    resolver: zodResolver(pspsSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      peneira1: 0,
      peneira2: 0,
      peneira3: 0,
      peneira4: 0,
      tmp: 0,
      status: 'Bom',
    },
  });

  // Watch peneiras para validação em tempo real
  const peneiras = useWatch({
    control: form.control,
    name: ['peneira1', 'peneira2', 'peneira3', 'peneira4'],
  });

  const totalPeneiras = peneiras.reduce((acc, p) => acc + (p || 0), 0);

  const handleSubmit = async (data: PspsFormData) => {
    // Validar que peneiras somam 100%
    const total = data.peneira1 + data.peneira2 + data.peneira3 + data.peneira4;
    if (Math.abs(total - 100) > 0.1) {
      toast.error('A soma dos peneiras deve ser 100%');
      return;
    }

    try {
      // TODO: Implementar salvamento em banco de dados
      toast.success('Análise PSPS registrada!');
      form.reset({
        data: new Date().toISOString().split('T')[0],
        peneira1: 0,
        peneira2: 0,
        peneira3: 0,
        peneira4: 0,
        tmp: 0,
        status: 'Bom',
      });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar análise PSPS');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Análise PSPS</DialogTitle>
          <DialogDescription>
            Registre a distribuição de tamanho de partículas (Penn State Particle Separator).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="psps-data">Data</Label>
            <Input
              id="psps-data"
              type="date"
              {...form.register('data')}
            />
            {form.formState.errors.data && (
              <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
            )}
          </div>

          {/* Peneiras */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Peneiras (%)</p>
            <p className="text-xs text-muted-foreground">
              Total: {totalPeneiras.toFixed(1)}% (deve ser 100%)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-p1">Peneira 1 (19 mm)</Label>
              <Input
                id="psps-p1"
                type="number"
                step="0.1"
                {...form.register('peneira1', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira1 && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira1.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-p2">Peneira 2 (8 mm)</Label>
              <Input
                id="psps-p2"
                type="number"
                step="0.1"
                {...form.register('peneira2', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira2 && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira2.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-p3">Peneira 3 (1.18 mm)</Label>
              <Input
                id="psps-p3"
                type="number"
                step="0.1"
                {...form.register('peneira3', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira3 && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira3.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-p4">Fundo (&lt;1.18 mm)</Label>
              <Input
                id="psps-p4"
                type="number"
                step="0.1"
                {...form.register('peneira4', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira4 && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira4.message}</p>
              )}
            </div>
          </div>

          {/* TMP e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-tmp">TMP (min)</Label>
              <Input
                id="psps-tmp"
                type="number"
                step="0.1"
                {...form.register('tmp', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="psps-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ideal">Ideal</SelectItem>
                      <SelectItem value="Bom">Bom</SelectItem>
                      <SelectItem value="Ruim">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
