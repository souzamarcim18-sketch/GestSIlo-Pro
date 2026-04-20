'use client';

import { useForm, Controller } from 'react-hook-form';
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
import { toast } from 'sonner';
import {
  avaliacaoBromatologicaSchema,
  MOMENTOS_AVALIACAO,
} from '@/lib/validations/silos';
import { q } from '@/lib/supabase/queries-audit';

// Omite silo_id do form — é passado como prop e adicionado no submit
const formSchema = avaliacaoBromatologicaSchema.omit({ silo_id: true });
type FormData = z.infer<typeof formSchema>;

interface AvaliacaoBromatologicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  onSuccess: () => void;
}

const defaultValues: FormData = {
  data: new Date().toISOString().split('T')[0],
  momento: 'Fechamento',
  ms: undefined,
  pb: undefined,
  fdn: undefined,
  fda: undefined,
  amido: undefined,
  ndt: undefined,
  ph: undefined,
  avaliador: '',
};

export function AvaliacaoBromatologicaDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: AvaliacaoBromatologicaDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = async (data: FormData) => {
    try {
      await q.avaliacoesBromatologicas.create({ silo_id: siloId, ...data });
      toast.success('Análise bromatológica registrada com sucesso!');
      form.reset(defaultValues);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar análise bromatológica');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Análise Bromatológica</DialogTitle>
          <DialogDescription>
            Registre a composição química e nutritiva da silagem. Campos numéricos são opcionais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Data e Momento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-data">Data *</Label>
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
              <Label htmlFor="brom-momento">Momento *</Label>
              <Controller
                control={form.control}
                name="momento"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="brom-momento">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MOMENTOS_AVALIACAO.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.momento && (
                <p className="text-xs text-destructive">{form.formState.errors.momento.message}</p>
              )}
            </div>
          </div>

          {/* Avaliador */}
          <div className="space-y-2">
            <Label htmlFor="brom-avaliador">Avaliador / Laboratório</Label>
            <Input
              id="brom-avaliador"
              placeholder="Ex: Lab XYZ"
              {...form.register('avaliador')}
            />
          </div>

          {/* MS, PB, FDN, FDA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-ms">MS — Matéria Seca (%)</Label>
              <Input
                id="brom-ms"
                type="number"
                step="0.01"
                placeholder="Ex: 32.5"
                {...form.register('ms', { valueAsNumber: true })}
              />
              {form.formState.errors.ms && (
                <p className="text-xs text-destructive">{form.formState.errors.ms.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-pb">PB — Proteína Bruta (%)</Label>
              <Input
                id="brom-pb"
                type="number"
                step="0.01"
                placeholder="Ex: 8.2"
                {...form.register('pb', { valueAsNumber: true })}
              />
              {form.formState.errors.pb && (
                <p className="text-xs text-destructive">{form.formState.errors.pb.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-fdn">FDN — Fibra em Det. Neutro (%)</Label>
              <Input
                id="brom-fdn"
                type="number"
                step="0.01"
                placeholder="Ex: 55.0"
                {...form.register('fdn', { valueAsNumber: true })}
              />
              {form.formState.errors.fdn && (
                <p className="text-xs text-destructive">{form.formState.errors.fdn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-fda">FDA — Fibra em Det. Ácido (%)</Label>
              <Input
                id="brom-fda"
                type="number"
                step="0.01"
                placeholder="Ex: 28.0"
                {...form.register('fda', { valueAsNumber: true })}
              />
              {form.formState.errors.fda && (
                <p className="text-xs text-destructive">{form.formState.errors.fda.message}</p>
              )}
            </div>
          </div>

          {/* Amido, NDT, pH */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brom-amido">Amido (%)</Label>
              <Input
                id="brom-amido"
                type="number"
                step="0.01"
                placeholder="Ex: 30.0"
                {...form.register('amido', { valueAsNumber: true })}
              />
              {form.formState.errors.amido && (
                <p className="text-xs text-destructive">{form.formState.errors.amido.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-ndt">NDT — Nut. Dig. Totais (%)</Label>
              <Input
                id="brom-ndt"
                type="number"
                step="0.01"
                placeholder="Ex: 65.0"
                {...form.register('ndt', { valueAsNumber: true })}
              />
              {form.formState.errors.ndt && (
                <p className="text-xs text-destructive">{form.formState.errors.ndt.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brom-ph">pH</Label>
              <Input
                id="brom-ph"
                type="number"
                step="0.01"
                min="0"
                max="14"
                placeholder="Ex: 3.8"
                {...form.register('ph', { valueAsNumber: true })}
              />
              {form.formState.errors.ph && (
                <p className="text-xs text-destructive">{form.formState.errors.ph.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset(defaultValues);
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
