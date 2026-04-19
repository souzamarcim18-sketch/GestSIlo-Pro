'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { insumoFormSchema, type InsumoFormData } from '@/lib/validations/insumos';
import { useCategorias, useTiposByCategoria } from '@/lib/hooks/useCategorias';
import { criarInsumoAction } from '../actions';
import { useState } from 'react';
import type { CategoriaInsumo } from '@/types/insumos';

interface InsumoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias?: CategoriaInsumo[];
  onSuccess?: () => void;
}

export default function InsumoForm({
  open,
  onOpenChange,
  categorias: externalCategorias,
  onSuccess,
}: InsumoFormProps) {
  const { data: hookCategorias } = useCategorias();
  const categorias = externalCategorias || hookCategorias || [];

  const form = useForm<InsumoFormData>({
    resolver: zodResolver(insumoFormSchema),
    defaultValues: {
      nome: '',
      categoria_id: '',
      tipo_id: undefined,
      unidade: 'kg',
      quantidade_entrada: 0,
      valor_unitario: 0,
      fornecedor: '',
      local_armazen: '',
      estoque_minimo: 0,
      data: new Date().toISOString().split('T')[0],
      registrar_como_despesa: true,
      observacoes: '',
    },
  });

  const selectedCategoriaId = form.watch('categoria_id');
  const { data: tipos } = useTiposByCategoria(selectedCategoriaId || '');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(data: InsumoFormData) {
    setSubmitting(true);
    try {
      await criarInsumoAction(data);
      toast.success('Insumo criado com sucesso');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar insumo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Insumo</DialogTitle>
          <DialogDescription>
            Adicione um insumo ao estoque e registre a primeira entrada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome do Insumo *</Label>
            <Input
              id="nome"
              placeholder="Ex: Adubo NPK"
              {...form.register('nome')}
            />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>
            )}
          </div>

          {/* Categoria e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Controller
                name="categoria_id"
                control={form.control}
                render={({ field }) => {
                  const selectedCat = categorias.find(c => c.id === field.value);
                  return (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue>
                          {selectedCat ? selectedCat.nome : 'Selecione...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {form.formState.errors.categoria_id && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.categoria_id.message}</p>
              )}
            </div>

            {tipos && tipos.length > 0 && (
              <div>
                <Label>Tipo</Label>
                <Controller
                  name="tipo_id"
                  control={form.control}
                  render={({ field }) => {
                    const selectedTipo = tipos.find(t => t.id === field.value);
                    return (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue>
                            {selectedTipo ? selectedTipo.nome : 'Selecione...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {tipos.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
            )}
          </div>

          {/* Unidade e Fornecedor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unidade">Unidade *</Label>
              <Input
                id="unidade"
                placeholder="kg, L, Saco..."
                {...form.register('unidade')}
              />
              {form.formState.errors.unidade && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.unidade.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Input
                id="fornecedor"
                placeholder="Nome do fornecedor"
                {...form.register('fornecedor')}
              />
              {form.formState.errors.fornecedor && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.fornecedor.message}</p>
              )}
            </div>
          </div>

          {/* Local de Armazenamento */}
          <div>
            <Label htmlFor="local_armazen">Local de Armazenamento *</Label>
            <Input
              id="local_armazen"
              placeholder="Ex: Galpão 1, Prateleira A"
              {...form.register('local_armazen')}
            />
            {form.formState.errors.local_armazen && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.local_armazen.message}</p>
            )}
          </div>

          {/* Quantidade e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantidade_entrada">Qtde Entrada *</Label>
              <Input
                id="quantidade_entrada"
                type="number"
                step="0.01"
                placeholder="0"
                {...form.register('quantidade_entrada', { valueAsNumber: true })}
              />
              {form.formState.errors.quantidade_entrada && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.quantidade_entrada.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="valor_unitario">Valor Unit. (R$) *</Label>
              <Input
                id="valor_unitario"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...form.register('valor_unitario', { valueAsNumber: true })}
              />
              {form.formState.errors.valor_unitario && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.valor_unitario.message}</p>
              )}
            </div>
          </div>

          {/* Estoque Mínimo */}
          <div>
            <Label htmlFor="estoque_minimo">Estoque Mínimo *</Label>
            <Input
              id="estoque_minimo"
              type="number"
              step="0.01"
              placeholder="0"
              {...form.register('estoque_minimo', { valueAsNumber: true })}
            />
            {form.formState.errors.estoque_minimo && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.estoque_minimo.message}</p>
            )}
          </div>

          {/* Data */}
          <div>
            <Label htmlFor="data">Data do Cadastro *</Label>
            <Input
              id="data"
              type="date"
              {...form.register('data')}
            />
            {form.formState.errors.data && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.data.message}</p>
            )}
          </div>

          {/* Checkbox Despesa */}
          <div className="flex items-center gap-2">
            <Controller
              name="registrar_como_despesa"
              control={form.control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="registrar_como_despesa"
                />
              )}
            />
            <Label htmlFor="registrar_como_despesa" className="font-normal cursor-pointer">
              Registrar como Despesa
            </Label>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Notas adicionais..."
              className="min-h-20"
              {...form.register('observacoes')}
            />
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
              {submitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
