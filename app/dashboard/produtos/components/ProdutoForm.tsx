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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { produtoFormSchema } from '@/lib/validations/produtos';
import type { z } from 'zod';

type ProdutoFormData = z.input<typeof produtoFormSchema>;
import { criarProdutoAction, atualizarProdutoAction } from '../actions';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type CategoriaProdutoRow = Database['public']['Tables']['categorias_produto']['Row'];

interface ProdutoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: CategoriaProdutoRow[];
  produto?: ProdutoRow;
  onSuccess?: () => void;
}

export default function ProdutoForm({
  open,
  onOpenChange,
  categorias,
  produto,
  onSuccess,
}: ProdutoFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!produto;

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoFormSchema),
    defaultValues: {
      nome: '',
      categoria_id: '',
      unidade: '',
      quantidade_entrada: 0,
      estoque_minimo: 0,
      local_armazen: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (produto) {
        form.reset({
          nome: produto.nome,
          categoria_id: produto.categoria_id,
          unidade: produto.unidade,
          quantidade_entrada: 0,
          estoque_minimo: produto.estoque_minimo,
          custo_referencia: produto.custo_referencia ?? undefined,
          local_armazen: produto.local_armazen ?? '',
          observacoes: produto.observacoes ?? '',
        });
      } else {
        form.reset({
          nome: '',
          categoria_id: '',
          unidade: '',
          quantidade_entrada: 0,
          estoque_minimo: 0,
          local_armazen: '',
          observacoes: '',
        });
      }
    }
  }, [open, produto, form]);

  const selectedCat = form.watch('categoria_id');
  const catObj = categorias.find((c) => c.id === selectedCat);

  async function onSubmit(data: ProdutoFormData) {
    setSubmitting(true);
    try {
      if (isEdit) {
        await atualizarProdutoAction(produto!.id, data);
        toast.success('Produto atualizado com sucesso');
      } else {
        await criarProdutoAction(data);
        toast.success('Produto cadastrado com sucesso');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do produto.' : 'Adicione um produto ao estoque.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome-produto">Nome do Produto *</Label>
            <Input id="nome-produto" placeholder="Ex: Milho Grão" {...form.register('nome')} />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Controller
                name="categoria_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v);
                    const cat = categorias.find((c) => c.id === v);
                    if (cat && !form.getValues('unidade')) {
                      form.setValue('unidade', cat.unidade_padrao);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.categoria_id && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.categoria_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unidade-produto">
                Unidade *{catObj && <span className="text-muted-foreground font-normal"> (padrão: {catObj.unidade_padrao})</span>}
              </Label>
              <Input id="unidade-produto" placeholder="sacas, kg, litros..." {...form.register('unidade')} />
              {form.formState.errors.unidade && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.unidade.message}</p>
              )}
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qtd-entrada">Qtde Entrada Inicial</Label>
                <Input
                  id="qtd-entrada"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...form.register('quantidade_entrada', { valueAsNumber: true })}
                />
                {form.formState.errors.quantidade_entrada && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.quantidade_entrada.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor-unit-prod">Valor Unit. (R$)</Label>
                <Input
                  id="valor-unit-prod"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...form.register('valor_unitario', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="estoque-min-prod">Estoque Mínimo</Label>
              <Input
                id="estoque-min-prod"
                type="number"
                step="0.01"
                placeholder="0"
                {...form.register('estoque_minimo', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custo-ref">Custo Referência (R$)</Label>
              <Input
                id="custo-ref"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...form.register('custo_referencia', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="local-armazen">Local de Armazenamento</Label>
            <Input id="local-armazen" placeholder="Ex: Galpão A" {...form.register('local_armazen')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs-produto">Observações</Label>
            <Textarea
              id="obs-produto"
              placeholder="Notas adicionais..."
              className="min-h-20"
              {...form.register('observacoes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isEdit ? 'Salvando...' : 'Cadastrando...') : (isEdit ? 'Salvar' : 'Cadastrar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
