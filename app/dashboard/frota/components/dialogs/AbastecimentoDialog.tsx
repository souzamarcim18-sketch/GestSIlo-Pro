'use client';

import { useState } from 'react';
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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const abastecimentoSchema = z.object({
  maquina_id: z.string().min(1, 'Máquina obrigatória'),
  data: z.string().min(1, 'Data obrigatória'),
  combustivel: z.enum(['Diesel', 'Gasolina', 'Etanol', 'GNV']),
  litros: z.number().positive('Litros deve ser > 0'),
  valor: z.number().nonnegative('Valor não pode ser negativo'),
  hodometro: z.number().nonnegative('Hodômetro não pode ser negativo').optional(),
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
    },
  });

  const maquinaIdValue = watch('maquina_id');
  const registrarComoSaida = watch('registrar_como_saida');

  const selectValue = (val: string | null | undefined): string => (val as string) || '';

  const onSubmit = async (data: AbastecimentoFormData) => {
    setIsLoading(true);
    try {
      // Criar abastecimento
      const abastecimento = await q.abastecimentos.create({
        maquina_id: data.maquina_id,
        data: data.data,
        combustivel: data.combustivel,
        litros: data.litros,
        valor: data.valor,
        hodometro: data.hodometro || null,
      } as any);

      // Integração Frota → Insumos: Se marcado, criar saída de combustível
      if (data.registrar_como_saida && data.insumo_id) {
        try {
          const insumo = await q.insumos.getById(data.insumo_id);

          // Validar estoque
          if (insumo.estoque_atual < data.litros) {
            throw new Error(
              `Estoque insuficiente. Disponível: ${insumo.estoque_atual} L, Solicitado: ${data.litros} L`
            );
          }

          // Criar saída de combustível
          await q.movimentacoesInsumo.create({
            insumo_id: data.insumo_id,
            tipo: 'Saída',
            quantidade: data.litros,
            valor_unitario: data.valor / data.litros,
            tipo_saida: 'USO_INTERNO',
            destino_tipo: 'maquina',
            destino_id: data.maquina_id,
            origem: 'frota',
            data: data.data,
            observacoes: `Abastecimento de ${data.combustivel} - ${data.litros} L`,
          } as any);

          toast.success('Abastecimento registrado com saída de insumo');
        } catch (insumoError) {
          console.error('Erro ao integrar combustível:', insumoError);
          // Reverter abastecimento se falhar integração
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
                onValueChange={(v: string | null) => v && setValue('combustivel', v as any)}
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
              <Label htmlFor="abs-valor">Valor (R$)</Label>
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
              {...register('hodometro', { valueAsNumber: true })}
            />
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
            <div className="space-y-2 bg-blue-50 p-3 rounded">
              <Label htmlFor="abs-insumo">Insumo (Combustível)</Label>
              <Select
                value={watch('insumo_id') || ''}
                onValueChange={(v: string | null) => v && setValue('insumo_id', v)}
              >
                <SelectTrigger id="abs-insumo">
                  <SelectValue placeholder="Selecione combustível" />
                </SelectTrigger>
                <SelectContent>
                  {maquinas.length > 0 && (
                    <SelectItem value="">Carregando...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

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
