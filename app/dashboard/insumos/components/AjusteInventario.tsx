'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ajusteInventarioSchema, type AjusteInventarioData } from '@/lib/validations/insumos';
import { useInsumos } from '@/lib/hooks/useInsumos';
import { criarAjusteAction } from '../actions';
import { useState } from 'react';
import type { Insumo } from '@/types/insumos';

interface AjusteInventarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumos?: Insumo[];
  insumoPredefined?: string;
  onSuccess?: () => void;
}

export default function AjusteInventario({
  open,
  onOpenChange,
  insumos: externalInsumos,
  insumoPredefined,
  onSuccess,
}: AjusteInventarioProps) {
  const { data: hookInsumos } = useInsumos();
  const insumos = externalInsumos || hookInsumos || [];
  const [submitting, setSubmitting] = useState(false);

  const insumoSelecionado = insumos.find(i => i.id === insumoPredefined);

  const form = useForm<AjusteInventarioData>({
    resolver: zodResolver(ajusteInventarioSchema),
    defaultValues: {
      insumo_id: insumoPredefined || '',
      estoque_real: insumoSelecionado?.estoque_atual ?? 0,
      motivo: '',
    },
  });

  // Atualiza o estoque_real quando o insumo é alterado
  const insumoId = form.watch('insumo_id');
  const insumoAtual = insumos.find(i => i.id === insumoId);

  async function onSubmit(data: AjusteInventarioData) {
    setSubmitting(true);
    try {
      await criarAjusteAction(data);
      toast.success('Ajuste registrado com sucesso');
      form.reset({
        insumo_id: '',
        estoque_real: 0,
        motivo: '',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar ajuste');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar Inventário</DialogTitle>
          <DialogDescription>
            Corrija a quantidade de estoque baseado na contagem física.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Insumo */}
          <div>
            <Label>Insumo *</Label>
            <Controller
              name="insumo_id"
              control={form.control}
              render={({ field }) => {
                const selectedInsumo = insumos.find(i => i.id === field.value);
                return (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue>
                        {selectedInsumo
                          ? `${selectedInsumo.nome} (${selectedInsumo.estoque_atual} ${selectedInsumo.unidade})`
                          : 'Selecione...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {insumos
                        .filter(i => i.ativo)
                        .map((insumo) => (
                          <SelectItem key={insumo.id} value={insumo.id}>
                            {insumo.nome} ({insumo.estoque_atual} {insumo.unidade})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {form.formState.errors.insumo_id && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.insumo_id.message}</p>
            )}
          </div>

          {/* Info estoque atual */}
          {insumoAtual && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm">
              <p className="text-muted-foreground">
                <strong>Estoque Registrado:</strong> {insumoAtual.estoque_atual} {insumoAtual.unidade}
              </p>
            </div>
          )}

          {/* Estoque Real */}
          <div>
            <Label htmlFor="estoque_real">Estoque Real (Contagem Física) *</Label>
            <Input
              id="estoque_real"
              type="number"
              step="0.01"
              placeholder="0"
              {...form.register('estoque_real', { valueAsNumber: true })}
            />
            {form.formState.errors.estoque_real && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.estoque_real.message}</p>
            )}
            {insumoAtual && (
              <p className="text-xs text-muted-foreground mt-1">
                Diferença:{' '}
                <span className={parseFloat(form.watch('estoque_real') as any) - insumoAtual.estoque_atual < 0 ? 'text-red-600' : 'text-green-600'}>
                  {parseFloat(form.watch('estoque_real') as any) - insumoAtual.estoque_atual > 0 ? '+' : ''}
                  {(parseFloat(form.watch('estoque_real') as any) - insumoAtual.estoque_atual).toFixed(2)}
                </span>
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="motivo">Motivo do Ajuste *</Label>
            <Input
              id="motivo"
              placeholder="Ex: Contagem física de inventário, quebra, perda"
              {...form.register('motivo')}
            />
            {form.formState.errors.motivo && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.motivo.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Ajustando...' : 'Registrar Ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
