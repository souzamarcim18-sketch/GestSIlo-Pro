'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { entradaInsumoSchema, type EntradaInsumoData } from '@/lib/validations/insumos';
import { criarEntradaInsumoAction } from '../actions';
import InsumoAutocomplete from './InsumoAutocomplete';
import type { Insumo } from '@/types/insumos';

interface EntradaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumos?: Insumo[];
  insumoPredefined?: string;
  onSuccess?: () => void;
}

export default function EntradaForm({
  open,
  onOpenChange,
  insumos = [],
  insumoPredefined,
  onSuccess,
}: EntradaFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EntradaInsumoData>({
    resolver: zodResolver(entradaInsumoSchema),
    defaultValues: {
      insumo_id: insumoPredefined ?? '',
      quantidade: 0,
      valor_unitario: 0,
      data: new Date().toISOString().split('T')[0],
      responsavel: '',
      registrar_como_despesa: false,
      observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        insumo_id: insumoPredefined ?? '',
        quantidade: 0,
        valor_unitario: 0,
        data: new Date().toISOString().split('T')[0],
        responsavel: '',
        registrar_como_despesa: false,
        observacoes: '',
      });
    }
  }, [open, insumoPredefined, form]);

  async function onSubmit(data: EntradaInsumoData) {
    setSubmitting(true);
    try {
      await criarEntradaInsumoAction(data);
      toast.success('Entrada registrada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar entrada');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Entrada de Insumo</DialogTitle>
          <DialogDescription>Registre a entrada de estoque de um insumo já cadastrado.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="insumo_id"
            control={form.control}
            render={({ field }) => (
              <InsumoAutocomplete
                label="Insumo *"
                value={field.value}
                onChange={field.onChange}
                insumos={insumos.filter((i) => i.ativo)}
              />
            )}
          />
          {form.formState.errors.insumo_id && (
            <p className="text-xs text-destructive">{form.formState.errors.insumo_id.message}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="qtd-entrada-insumo">Quantidade *</Label>
              <Input
                id="qtd-entrada-insumo"
                type="number"
                step="0.01"
                placeholder="0"
                {...form.register('quantidade', { valueAsNumber: true })}
              />
              {form.formState.errors.quantidade && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.quantidade.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor-unit-entrada-insumo">Valor Unit. (R$)</Label>
              <Input
                id="valor-unit-entrada-insumo"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...form.register('valor_unitario', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data-entrada-insumo">Data *</Label>
              <Input id="data-entrada-insumo" type="date" {...form.register('data')} />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.data.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="responsavel-entrada-insumo">Responsável</Label>
              <Input id="responsavel-entrada-insumo" placeholder="Nome" {...form.register('responsavel')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs-entrada-insumo">Observações</Label>
            <Input id="obs-entrada-insumo" placeholder="Notas adicionais..." {...form.register('observacoes')} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded border border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-900/30">
            <Controller
              name="registrar_como_despesa"
              control={form.control}
              render={({ field }) => (
                <Checkbox
                  id="registrar_como_despesa_entrada"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="registrar_como_despesa_entrada" className="cursor-pointer flex-1 mb-0">
              Registrar como despesa no Financeiro
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
