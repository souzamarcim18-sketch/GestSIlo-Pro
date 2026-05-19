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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ajusteInventarioSchema, type AjusteInventarioData } from '@/lib/validations/produtos';
import { criarAjusteProdutoAction } from '../actions';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];

interface AjusteInventarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoRow[];
  produtoPredefined?: string;
  onSuccess?: () => void;
}

export default function AjusteInventario({
  open,
  onOpenChange,
  produtos,
  produtoPredefined,
  onSuccess,
}: AjusteInventarioProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AjusteInventarioData>({
    resolver: zodResolver(ajusteInventarioSchema),
    defaultValues: {
      produto_id: produtoPredefined ?? '',
      estoque_real: 0,
      motivo: '',
    },
  });

  useEffect(() => {
    if (open) {
      const produtoAtual = produtos.find((p) => p.id === produtoPredefined);
      form.reset({
        produto_id: produtoPredefined ?? '',
        estoque_real: produtoAtual?.estoque_atual ?? 0,
        motivo: '',
      });
    }
  }, [open, produtoPredefined, produtos, form]);

  const produtoId = form.watch('produto_id');
  const produtoAtual = produtos.find((p) => p.id === produtoId);
  const estoqueReal = form.watch('estoque_real');
  const delta = typeof estoqueReal === 'number' && produtoAtual
    ? estoqueReal - produtoAtual.estoque_atual
    : null;

  async function onSubmit(data: AjusteInventarioData) {
    setSubmitting(true);
    try {
      await criarAjusteProdutoAction(data);
      toast.success('Ajuste registrado com sucesso');
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
          <div>
            <Label>Produto *</Label>
            <Controller
              name="produto_id"
              control={form.control}
              render={({ field }) => {
                const selected = produtos.find((p) => p.id === field.value);
                return (
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v);
                    const p = produtos.find((pr) => pr.id === v);
                    if (p) form.setValue('estoque_real', p.estoque_atual);
                  }}>
                    <SelectTrigger>
                      <SelectValue>
                        {selected
                          ? `${selected.nome} (${selected.estoque_atual} ${selected.unidade})`
                          : 'Selecione...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.filter((p) => p.ativo).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} ({p.estoque_atual} {p.unidade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {form.formState.errors.produto_id && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.produto_id.message}</p>
            )}
          </div>

          {produtoAtual && (
            <div className="bg-muted/50 p-3 rounded text-sm">
              <p className="text-muted-foreground">
                <strong>Estoque registrado:</strong> {produtoAtual.estoque_atual} {produtoAtual.unidade}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="estoque-real-prod">Estoque Real (Contagem Física) *</Label>
            <Input
              id="estoque-real-prod"
              type="number"
              step="0.01"
              placeholder="0"
              {...form.register('estoque_real', { valueAsNumber: true })}
            />
            {form.formState.errors.estoque_real && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.estoque_real.message}</p>
            )}
            {delta !== null && produtoAtual && (
              <p className="text-xs text-muted-foreground mt-1">
                Diferença:{' '}
                <span className={delta < 0 ? 'text-red-600' : 'text-green-600'}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)} {produtoAtual.unidade}
                </span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="motivo-ajuste">Motivo do Ajuste *</Label>
            <Input
              id="motivo-ajuste"
              placeholder="Ex: Contagem física de inventário, quebra, perda"
              {...form.register('motivo')}
            />
            {form.formState.errors.motivo && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.motivo.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
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
