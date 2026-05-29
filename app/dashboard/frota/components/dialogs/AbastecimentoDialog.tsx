'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { type Maquina } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import type { Insumo } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const abastecimentoSchema = z.object({
  maquina_id: z.string().min(1, 'Máquina obrigatória'),
  data: z.string().min(1, 'Data obrigatória'),
  combustivel: z.enum(['Diesel', 'Gasolina', 'Etanol', 'GNV']),
  litros: z.number().positive('Litros deve ser > 0'),
  valor: z.number().nonnegative('Valor não pode ser negativo'),
  hodometro: z.number().nonnegative().optional(),
  insumo_id: z.string().uuid().optional(),
  registrar_como_saida: z.boolean(),
});

type AbastecimentoFormData = z.infer<typeof abastecimentoSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AbastecimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  onSuccess: () => void;
}

export function AbastecimentoDialog({
  open,
  onOpenChange,
  maquinas,
  onSuccess,
}: AbastecimentoDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AbastecimentoFormData>({
    resolver: zodResolver(abastecimentoSchema),
    defaultValues: {
      maquina_id: '',
      data: new Date().toISOString().split('T')[0],
      registrar_como_saida: true,
      combustivel: 'Diesel',
      valor: 0,
    },
  });

  const maquinaIdValue = watch('maquina_id');
  const registrarComoSaida = watch('registrar_como_saida');
  const insumoIdValue = watch('insumo_id');
  const litrosValue = watch('litros');

  // Buscar apenas insumos da categoria "Combustíveis" ao abrir o dialog
  useEffect(() => {
    if (!open) return;
    setLoadingInsumos(true);
    q.categorias.list()
      .then((cats) => {
        const catCombustivel = cats.find((c) =>
          c.nome.toLowerCase().includes('combust')
        );
        return q.insumos.list(catCombustivel ? { categoria_id: catCombustivel.id } : undefined);
      })
      .then((data) => setInsumos(data))
      .catch(() => toast.error('Erro ao carregar insumos'))
      .finally(() => setLoadingInsumos(false));
  }, [open]);

  // Calcular valor automaticamente quando insumo ou litros mudam
  useEffect(() => {
    if (!insumoIdValue || !litrosValue || litrosValue <= 0) return;
    const insumo = insumos.find((i) => i.id === insumoIdValue);
    if (insumo?.custo_medio && insumo.custo_medio > 0) {
      setValue('valor', parseFloat((litrosValue * insumo.custo_medio).toFixed(2)));
    }
  }, [insumoIdValue, litrosValue, insumos, setValue]);

  const insumoSelecionado = insumos.find((i) => i.id === insumoIdValue);

  const onSubmit = async (data: AbastecimentoFormData) => {
    setIsLoading(true);
    try {
      const abastecimento = await q.abastecimentos.create({
        maquina_id: data.maquina_id,
        data: data.data,
        combustivel: data.combustivel,
        litros: data.litros,
        valor: data.valor,
        hodometro: data.hodometro ?? null,
      });

      // Integração Frota → Insumos
      if (data.registrar_como_saida && data.insumo_id) {
        try {
          const insumo = insumos.find((i) => i.id === data.insumo_id);
          if (!insumo) throw new Error('Insumo não encontrado');

          if (insumo.estoque_atual < data.litros) {
            throw new Error(
              `Estoque insuficiente. Disponível: ${insumo.estoque_atual} ${insumo.unidade}, Solicitado: ${data.litros} ${insumo.unidade}`
            );
          }

          await q.movimentacoesInsumo.create({
            insumo_id: data.insumo_id,
            tipo: 'Saída',
            quantidade: data.litros,
            valor_unitario: data.litros > 0 ? data.valor / data.litros : 0,
            tipo_saida: 'USO_INTERNO',
            destino_tipo: 'maquina',
            destino_id: data.maquina_id,
            origem: 'frota',
            data: data.data,
            observacoes: `Abastecimento de ${data.combustivel} - ${data.litros} L`,
          });

          toast.success('Abastecimento registrado com saída de insumo');
        } catch (insumoError) {
          await q.abastecimentos.remove(abastecimento.id);
          throw insumoError;
        }
      } else {
        toast.success('Abastecimento registrado');
      }

      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar abastecimento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const selectValue = (val: string | null | undefined): string => (val as string) || '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Abastecimento</DialogTitle>
          <DialogDescription>Registre combustível consumido</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="abs-maquina">Máquina</Label>
            <Select
              value={selectValue(maquinaIdValue)}
              onValueChange={(v: string | null) => v && setValue('maquina_id', v)}
            >
              <SelectTrigger id="abs-maquina">
                <SelectValue>
                  {maquinaIdValue
                    ? maquinas.find((m) => m.id === maquinaIdValue)?.nome || 'Selecione'
                    : 'Selecione'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {maquinas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.maquina_id && (
              <p className="text-sm text-red-500">{errors.maquina_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="abs-data">Data</Label>
              <Input id="abs-data" type="date" {...register('data')} />
              {errors.data && <p className="text-sm text-red-500">{errors.data.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abs-combustivel">Combustível</Label>
              <Select
                value={watch('combustivel') || ''}
                onValueChange={(v: string | null) => v && setValue('combustivel', v as AbastecimentoFormData['combustivel'])}
              >
                <SelectTrigger id="abs-combustivel">
                  <SelectValue>{watch('combustivel') || 'Selecione'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {['Diesel', 'Gasolina', 'Etanol', 'GNV'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.combustivel && (
                <p className="text-sm text-red-500">{errors.combustivel.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('registrar_como_saida')}
                className="w-4 h-4"
              />
              <span className="text-sm">Registrar como saída de insumo</span>
            </label>
          </div>

          {registrarComoSaida && (
            <div className="space-y-2 bg-muted/40 p-3 rounded-lg border">
              <Label htmlFor="abs-insumo">Insumo (Combustível)</Label>
              <Select
                value={selectValue(insumoIdValue)}
                onValueChange={(v) => {
                  setValue('insumo_id', v ?? undefined);
                }}
              >
                <SelectTrigger id="abs-insumo">
                  <SelectValue placeholder={loadingInsumos ? 'Carregando...' : 'Selecione o insumo'} />
                </SelectTrigger>
                <SelectContent>
                  {insumos.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id}>
                      {ins.nome} — estoque: {ins.estoque_atual} {ins.unidade}
                    </SelectItem>
                  ))}
                  {!loadingInsumos && insumos.length === 0 && (
                    <SelectItem value="__empty__" disabled>
                      Nenhum insumo cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {insumoSelecionado?.custo_medio && (
                <p className="text-xs text-muted-foreground">
                  Custo médio: R$ {insumoSelecionado.custo_medio.toFixed(3)}/{insumoSelecionado.unidade} — valor calculado automaticamente
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="abs-litros">Litros</Label>
              <Input
                id="abs-litros"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('litros', { valueAsNumber: true })}
              />
              {errors.litros && <p className="text-sm text-red-500">{errors.litros.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abs-valor">
                Valor (R$)
                {registrarComoSaida && insumoSelecionado?.custo_medio ? (
                  <span className="text-xs text-muted-foreground ml-1">(calculado)</span>
                ) : null}
              </Label>
              <Input
                id="abs-valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('valor', { valueAsNumber: true })}
              />
              {errors.valor && <p className="text-sm text-red-500">{errors.valor.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="abs-hodometro">Hodômetro (opcional)</Label>
            <Input
              id="abs-hodometro"
              type="number"
              placeholder="0"
              {...register('hodometro', {
                setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
              })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
