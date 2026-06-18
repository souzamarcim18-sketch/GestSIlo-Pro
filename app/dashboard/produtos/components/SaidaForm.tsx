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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saidaFormSchema } from '@/lib/validations/produtos';
import type { z } from 'zod';
type SaidaFormData = z.input<typeof saidaFormSchema>;
import { criarSaidaProdutoAction } from '../actions';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type InsumoRow = Database['public']['Tables']['insumos']['Row'];

interface SaidaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoRow[];
  insumos?: InsumoRow[];
  produtoPredefined?: string;
  onSuccess?: () => void;
}

const TIPO_SAIDA_LABELS: Record<string, string> = {
  VENDA: 'Venda',
  PERDA: 'Perda',
  TRANSFERENCIA_INSUMO: 'Transferência para Insumo',
  DESCARTE: 'Descarte',
};

// Tipos que exibem o campo de valor unitário
const TIPOS_COM_VALOR = ['VENDA', 'TRANSFERENCIA_INSUMO'];

export default function SaidaForm({
  open,
  onOpenChange,
  produtos,
  insumos = [],
  produtoPredefined,
  onSuccess,
}: SaidaFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SaidaFormData>({
    resolver: zodResolver(saidaFormSchema),
    defaultValues: {
      produto_id: produtoPredefined ?? '',
      tipo_saida: 'VENDA',
      quantidade: 0,
      registrar_como_receita: false,
      data: new Date().toISOString().split('T')[0],
      responsavel: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        produto_id: produtoPredefined ?? '',
        tipo_saida: 'VENDA',
        quantidade: 0,
        registrar_como_receita: false,
        data: new Date().toISOString().split('T')[0],
        responsavel: '',
        observacoes: '',
      });
    }
  }, [open, produtoPredefined, form]);

  const tipoSaida = form.watch('tipo_saida');
  const produtoSelecionado = produtos.find(p => p.id === form.watch('produto_id'));

  // Limpa o valor unitário quando o tipo de saída não usa esse campo
  useEffect(() => {
    if (!TIPOS_COM_VALOR.includes(tipoSaida)) {
      form.setValue('valor_unitario', undefined);
    }
  }, [tipoSaida, form]);

  async function onSubmit(data: SaidaFormData) {
    // Validação client-side de estoque disponível
    if (produtoSelecionado && data.quantidade > produtoSelecionado.estoque_atual) {
      toast.error(
        `Estoque insuficiente. Disponível: ${produtoSelecionado.estoque_atual} ${produtoSelecionado.unidade}, solicitado: ${data.quantidade}`
      );
      return;
    }

    setSubmitting(true);
    try {
      await criarSaidaProdutoAction(data);
      toast.success('Saída registrada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar saída');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Saída</DialogTitle>
          <DialogDescription>Registre a saída de um produto do estoque.</DialogDescription>
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

          <div className="space-y-1.5">
            <Label>Tipo de Saída *</Label>
            <Controller
              name="tipo_saida"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_SAIDA_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className={TIPOS_COM_VALOR.includes(tipoSaida) ? 'grid grid-cols-2 gap-4' : ''}>
            <div className="space-y-1.5">
              <Label htmlFor="qtd-saida">
                Quantidade *
                {produtoSelecionado && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (disponível: {produtoSelecionado.estoque_atual} {produtoSelecionado.unidade})
                  </span>
                )}
              </Label>
              <Input
                id="qtd-saida"
                type="number"
                step="0.01"
                placeholder="0"
                max={produtoSelecionado?.estoque_atual ?? undefined}
                {...form.register('quantidade', { valueAsNumber: true })}
              />
              {form.formState.errors.quantidade && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.quantidade.message}</p>
              )}
            </div>
            {TIPOS_COM_VALOR.includes(tipoSaida) && (
              <div className="space-y-1.5">
                <Label htmlFor="valor-unit-saida">
                  Valor Unit. (R$){tipoSaida === 'VENDA' && ' *'}
                </Label>
                <Input
                  id="valor-unit-saida"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...form.register('valor_unitario', { valueAsNumber: true })}
                />
                {form.formState.errors.valor_unitario && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.valor_unitario.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Campo condicional: TRANSFERENCIA_INSUMO */}
          {tipoSaida === 'TRANSFERENCIA_INSUMO' && (
            <div className="space-y-1.5">
              <Label>Insumo de Destino *</Label>
              <Controller
                name="insumo_id_destino"
                control={form.control}
                render={({ field }) => {
                  const selected = insumos.find((i) => i.id === field.value);
                  return (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue>
                          {selected ? selected.nome : 'Selecione o insumo...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.filter((i) => i.ativo).map((insumo) => (
                          <SelectItem key={insumo.id} value={insumo.id}>
                            {insumo.nome} ({insumo.estoque_atual} {insumo.unidade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {form.formState.errors.insumo_id_destino && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.insumo_id_destino.message}</p>
              )}
            </div>
          )}

          {/* Checkbox registrar como receita (apenas VENDA) */}
          {tipoSaida === 'VENDA' && (
            <div className="flex items-center gap-3 p-3 rounded border border-green-200/50 bg-green-50/30 dark:bg-green-950/20 dark:border-green-900/30">
              <Controller
                name="registrar_como_receita"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    id="registrar_como_receita"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="registrar_como_receita" className="cursor-pointer flex-1 mb-0">
                Registrar como receita no Financeiro
              </Label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data-saida">Data *</Label>
              <Input id="data-saida" type="date" {...form.register('data')} />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.data.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="responsavel-saida">Responsável</Label>
              <Input id="responsavel-saida" placeholder="Nome" {...form.register('responsavel')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs-saida">Observações</Label>
            <Textarea id="obs-saida" placeholder="Notas..." className="min-h-16" {...form.register('observacoes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar Saída'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
