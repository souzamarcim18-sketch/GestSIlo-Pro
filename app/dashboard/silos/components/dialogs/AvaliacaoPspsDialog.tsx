'use client';

import { useForm, Controller, useWatch } from 'react-hook-form';
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
  avaliacaoPspsSchema,
  MOMENTOS_AVALIACAO,
  FAIXAS_PSPS,
} from '@/lib/validations/silos';
import { q } from '@/lib/supabase/queries-audit';

// Omite silo_id do form — é passado como prop e adicionado no submit
const formSchema = avaliacaoPspsSchema.omit({ silo_id: true });
type FormData = z.infer<typeof formSchema>;

interface AvaliacaoPspsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  onSuccess: () => void;
}

const defaultValues: FormData = {
  data: new Date().toISOString().split('T')[0],
  momento: 'Fechamento',
  peneira_19mm: 0,
  peneira_8_19mm: 0,
  peneira_4_8mm: 0,
  peneira_fundo_4mm: 0,
  kernel_processor: false,
  tamanho_teorico_corte_mm: undefined,
  avaliador: '',
};

export function AvaliacaoPspsDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: AvaliacaoPspsDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Validação em tempo real da soma das peneiras
  const peneiras = useWatch({
    control: form.control,
    name: ['peneira_19mm', 'peneira_8_19mm', 'peneira_4_8mm', 'peneira_fundo_4mm'],
  });
  const totalPeneiras = peneiras.reduce((acc, p) => acc + (Number(p) || 0), 0);
  const somaValida = totalPeneiras >= 99.5 && totalPeneiras <= 100.5;
  const somaCorClass = somaValida
    ? 'text-green-600'
    : 'text-destructive font-semibold';

  const handleSubmit = async (data: FormData) => {
    try {
      // tmp_mm é GENERATED pelo BD — não enviar no payload
      await q.avaliacoesPsps.create({ silo_id: siloId, ...data });
      toast.success('Análise PSPS registrada com sucesso!');
      form.reset(defaultValues);
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
            Penn State Particle Separator — distribuição de tamanho de partículas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Data e Momento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-data">Data *</Label>
              <Input
                id="psps-data"
                type="date"
                {...form.register('data')}
              />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-momento">Momento *</Label>
              <Controller
                control={form.control}
                name="momento"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="psps-momento">
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

          {/* Peneiras — indicador de soma em tempo real */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Peneiras (%)</p>
            <p className={`text-xs ${somaCorClass}`}>
              Total: {totalPeneiras.toFixed(1)}%{' '}
              {somaValida ? '✓ válido' : '(deve ser 100% ± 0.5%)'}
            </p>
            <p className="text-xs text-muted-foreground">
              Faixas ideais: {'>'}19mm: {FAIXAS_PSPS.peneira_19mm.min}–{FAIXAS_PSPS.peneira_19mm.max}% •
              8–19mm: {FAIXAS_PSPS.peneira_8_19mm.min}–{FAIXAS_PSPS.peneira_8_19mm.max}% •
              4–8mm: {FAIXAS_PSPS.peneira_4_8mm.min}–{FAIXAS_PSPS.peneira_4_8mm.max}% •
              {'<'}4mm: {FAIXAS_PSPS.peneira_fundo_4mm.min}–{FAIXAS_PSPS.peneira_fundo_4mm.max}%
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-p19">Peneira {'>'}19mm (%)</Label>
              <Input
                id="psps-p19"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...form.register('peneira_19mm', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira_19mm && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira_19mm.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-p8-19">Peneira 8–19mm (%)</Label>
              <Input
                id="psps-p8-19"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...form.register('peneira_8_19mm', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira_8_19mm && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira_8_19mm.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-p4-8">Peneira 4–8mm (%)</Label>
              <Input
                id="psps-p4-8"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...form.register('peneira_4_8mm', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira_4_8mm && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira_4_8mm.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-pfundo">Fundo {'<'}4mm (%)</Label>
              <Input
                id="psps-pfundo"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...form.register('peneira_fundo_4mm', { valueAsNumber: true })}
              />
              {form.formState.errors.peneira_fundo_4mm && (
                <p className="text-xs text-destructive">{form.formState.errors.peneira_fundo_4mm.message}</p>
              )}
            </div>
          </div>

          {/* Kernel Processor e Tamanho teórico */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="psps-kp">Kernel Processor *</Label>
              <Controller
                control={form.control}
                name="kernel_processor"
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val === 'true')}
                    value={field.value ? 'true' : 'false'}
                  >
                    <SelectTrigger id="psps-kp">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Sem KP</SelectItem>
                      <SelectItem value="true">Com KP</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="psps-tcc">Tamanho teórico de corte (mm)</Label>
              <Input
                id="psps-tcc"
                type="number"
                step="0.1"
                min="0"
                placeholder="Ex: 19.0"
                {...form.register('tamanho_teorico_corte_mm', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Avaliador */}
          <div className="space-y-2">
            <Label htmlFor="psps-avaliador">Avaliador</Label>
            <Input
              id="psps-avaliador"
              placeholder="Ex: Técnico / Consultor"
              {...form.register('avaliador')}
            />
          </div>

          {/* Nota sobre TMP */}
          <p className="text-xs text-muted-foreground">
            O TMP (Tamanho Médio de Partícula) é calculado automaticamente pelo banco de dados após salvar.
          </p>

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
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !somaValida}
              title={!somaValida ? 'Corrija a soma das peneiras para 100% (±0.5%)' : undefined}
            >
              {form.formState.isSubmitting ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
