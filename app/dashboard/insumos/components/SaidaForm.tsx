'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { saidaFormSchema, type SaidaFormData } from '@/lib/validations/insumos';
import { useInsumos } from '@/lib/hooks/useInsumos';
import { useDestinos } from '@/lib/hooks/useDestinos';
import { criarSaidaAction } from '../actions';
import InsumoAutocomplete from './InsumoAutocomplete';
import { useState } from 'react';
import type { Insumo } from '@/types/insumos';

interface SaidaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumos?: Insumo[];
  insumoPredefined?: string;
  onSuccess?: () => void;
}

type TipoSaida = 'USO_INTERNO' | 'TRANSFERENCIA' | 'VENDA' | 'DEVOLUCAO' | 'DESCARTE' | 'TROCA';

export default function SaidaForm({
  open,
  onOpenChange,
  insumos: externalInsumos,
  insumoPredefined,
  onSuccess,
}: SaidaFormProps) {
  const { data: hookInsumos } = useInsumos();
  const insumos = externalInsumos || hookInsumos || [];
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SaidaFormData>({
    resolver: zodResolver(saidaFormSchema),
    defaultValues: {
      insumo_id: insumoPredefined || '',
      tipo_saida: 'USO_INTERNO',
      quantidade: 0,
      valor_unitario: 0,
      destino_tipo: undefined,
      destino_id: undefined,
      destino_texto: '',
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
      observacoes: '',
    },
  });

  const tipoSaida = form.watch('tipo_saida') as TipoSaida;
  const destinoTipo = form.watch('destino_tipo') as string;
  const insumoSelecionado = insumos.find(i => i.id === form.watch('insumo_id'));
  const { data: destinos, isLoading: loadingDestinos } = useDestinos(destinoTipo);

  async function onSubmit(data: SaidaFormData) {
    setSubmitting(true);
    try {
      await criarSaidaAction(data);
      toast.success('Saída registrada com sucesso');
      form.reset({
        insumo_id: '',
        tipo_saida: 'USO_INTERNO',
        quantidade: 0,
        valor_unitario: 0,
        destino_tipo: undefined,
        destino_id: undefined,
        destino_texto: '',
        responsavel: '',
        data: new Date().toISOString().split('T')[0],
        observacoes: '',
      });
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
          <DialogTitle>Registrar Saída de Insumo</DialogTitle>
          <DialogDescription>
            Registre a saída de um insumo do estoque.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Insumo com Autocomplete */}
          <Controller
            name="insumo_id"
            control={form.control}
            render={({ field }) => (
              <InsumoAutocomplete
                label="Insumo *"
                value={field.value}
                onChange={field.onChange}
                insumos={insumos.filter(i => i.ativo)}
              />
            )}
          />
          {form.formState.errors.insumo_id && (
            <p className="text-xs text-destructive">{form.formState.errors.insumo_id.message}</p>
          )}

          {/* Tipo Saída */}
          <div>
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
                    <SelectItem value="USO_INTERNO">Uso Interno</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    <SelectItem value="VENDA">Venda</SelectItem>
                    <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                    <SelectItem value="DESCARTE">Descarte</SelectItem>
                    <SelectItem value="TROCA">Troca</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
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
              <Label htmlFor="valor_unitario">Valor Unit. (R$)</Label>
              <Input
                id="valor_unitario"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...form.register('valor_unitario', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Campos dinâmicos por tipo_saida */}
          {tipoSaida === 'USO_INTERNO' && (
            <>
              <div>
                <Label>Destino Tipo *</Label>
                <Controller
                  name="destino_tipo"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="talhao">Talhão</SelectItem>
                        <SelectItem value="maquina">Máquina</SelectItem>
                        <SelectItem value="silo">Silo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.destino_tipo && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_tipo.message}</p>
                )}
              </div>
              <div>
                <Label>Destino {destinoTipo && `(${destinoTipo})`} *</Label>
                <Controller
                  name="destino_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange} disabled={!destinoTipo || loadingDestinos}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingDestinos ? 'Carregando...' : 'Selecione...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {destinos?.map((destino) => (
                          <SelectItem key={destino.id} value={destino.id}>
                            {destino.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.destino_id && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_id.message}</p>
                )}
              </div>
            </>
          )}

          {tipoSaida === 'DEVOLUCAO' && (
            <div>
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Input
                id="fornecedor"
                placeholder="Nome do fornecedor"
                {...form.register('destino_texto')}
              />
              {form.formState.errors.destino_texto && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_texto.message}</p>
              )}
            </div>
          )}

          {tipoSaida === 'VENDA' && (
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                placeholder="Nome do cliente"
                {...form.register('destino_texto')}
              />
              {form.formState.errors.destino_texto && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_texto.message}</p>
              )}
            </div>
          )}

          {tipoSaida === 'DESCARTE' && (
            <div>
              <Label htmlFor="motivo">Motivo *</Label>
              <Input
                id="motivo"
                placeholder="Motivo do descarte"
                {...form.register('destino_texto')}
              />
              {form.formState.errors.destino_texto && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_texto.message}</p>
              )}
            </div>
          )}

          {tipoSaida === 'TRANSFERENCIA' && (
            <div>
              <Label htmlFor="fazenda_destino">Fazenda Destino *</Label>
              <Input
                id="fazenda_destino"
                placeholder="Nome da fazenda destino"
                {...form.register('destino_texto')}
              />
              {form.formState.errors.destino_texto && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_texto.message}</p>
              )}
            </div>
          )}

          {tipoSaida === 'TROCA' && (
            <div>
              <Label>Outro Insumo *</Label>
              <Controller
                name="destino_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos
                        .filter(i => i.ativo && i.id !== form.watch('insumo_id'))
                        .map((insumo) => (
                          <SelectItem key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.destino_id && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.destino_id.message}</p>
              )}
            </div>
          )}

          {/* Responsável e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="responsavel">Responsável *</Label>
              <Input
                id="responsavel"
                placeholder="Nome"
                {...form.register('responsavel')}
              />
              {form.formState.errors.responsavel && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.responsavel.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                {...form.register('data')}
              />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.data.message}</p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              placeholder="Notas adicionais..."
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
              {submitting ? 'Registrando...' : 'Registrar Saída'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
