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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { entradaFormSchema, type EntradaFormData } from '@/lib/validations/produtos';
import { criarEntradaAction } from '../actions';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];

interface EntradaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoRow[];
  produtoPredefined?: string;
  onSuccess?: () => void;
}

const TIPO_LABELS: Record<string, string> = {
  COLHEITA: 'Colheita',
  COMPRA: 'Compra',
  AJUSTE_INICIAL: 'Estoque inicial',
};

export default function EntradaForm({
  open,
  onOpenChange,
  produtos,
  produtoPredefined,
  onSuccess,
}: EntradaFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EntradaFormData>({
    resolver: zodResolver(entradaFormSchema),
    defaultValues: {
      produto_id: produtoPredefined ?? '',
      tipo_entrada: 'COLHEITA',
      quantidade: 0,
      data: new Date().toISOString().split('T')[0],
      responsavel: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        produto_id: produtoPredefined ?? '',
        tipo_entrada: 'COLHEITA',
        quantidade: 0,
        data: new Date().toISOString().split('T')[0],
        responsavel: '',
        observacoes: '',
      });
    }
  }, [open, produtoPredefined, form]);

  async function onSubmit(data: EntradaFormData) {
    setSubmitting(true);
    try {
      await criarEntradaAction(data);
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
          <DialogTitle>Registrar Entrada</DialogTitle>
          <DialogDescription>Registre a entrada de um produto no estoque.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="produto_id"
            control={form.control}
            render={({ field }) => (
              <ProdutoAutocomplete
                label="Produto *"
                value={field.value}
                onChange={field.onChange}
                produtos={produtos.filter((p) => p.ativo)}
              />
            )}
          />
          {form.formState.errors.produto_id && (
            <p className="text-xs text-destructive">{form.formState.errors.produto_id.message}</p>
          )}

          <div>
            <Label>Tipo de Entrada *</Label>
            <Controller
              name="tipo_entrada"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qtd-entrada-form">Quantidade *</Label>
              <Input
                id="qtd-entrada-form"
                type="number"
                step="0.01"
                placeholder="0"
                {...form.register('quantidade', { valueAsNumber: true })}
              />
              {form.formState.errors.quantidade && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.quantidade.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="valor-unit-entrada">Valor Unit. (R$)</Label>
              <Input
                id="valor-unit-entrada"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...form.register('valor_unitario', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data-entrada">Data *</Label>
              <Input id="data-entrada" type="date" {...form.register('data')} />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.data.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="responsavel-entrada">Responsável</Label>
              <Input id="responsavel-entrada" placeholder="Nome" {...form.register('responsavel')} />
            </div>
          </div>

          <div>
            <Label htmlFor="obs-entrada">Observações</Label>
            <Textarea id="obs-entrada" placeholder="Notas..." className="min-h-16" {...form.register('observacoes')} />
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
