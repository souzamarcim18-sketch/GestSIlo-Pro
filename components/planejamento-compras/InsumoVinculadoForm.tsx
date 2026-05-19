'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import InsumoAutocomplete, { type InsumoOption } from './InsumoAutocomplete';
import { planejamentoInsumoSchema, type PlanejamentoInsumoInput } from '@/lib/validations/planejamento-compras';
import { adicionarInsumoAoPlanejamentoAction } from '@/app/dashboard/planejamento-compras/actions';

interface InsumoVinculadoFormProps {
  planejamentoId: string;
  insumos: InsumoOption[];
  onSuccess?: () => void;
}

export default function InsumoVinculadoForm({
  planejamentoId,
  insumos,
  onSuccess,
}: InsumoVinculadoFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PlanejamentoInsumoInput>({
    resolver: zodResolver(planejamentoInsumoSchema),
    defaultValues: {
      planejamento_id: planejamentoId,
      insumo_id: '',
      quantidade: 0,
    },
  });

  const selectedInsumoId = form.watch('insumo_id');
  const selectedInsumo = insumos.find((i) => i.id === selectedInsumoId);
  const errors = form.formState.errors;

  async function onSubmit(data: PlanejamentoInsumoInput) {
    setSubmitting(true);
    const result = await adicionarInsumoAoPlanejamentoAction(data);
    setSubmitting(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Insumo adicionado com sucesso');
      form.reset({ planejamento_id: planejamentoId, insumo_id: '', quantidade: 0 });
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Controller
            control={form.control}
            name="insumo_id"
            render={({ field }) => (
              <InsumoAutocomplete
                label="Insumo"
                value={field.value}
                onChange={field.onChange}
                insumos={insumos}
              />
            )}
          />
          {errors.insumo_id && (
            <p className="text-xs text-red-400">{errors.insumo_id.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="quantidade_insumo" className="text-sm">
            Quantidade{selectedInsumo ? ` (${selectedInsumo.unidade})` : ''}
          </Label>
          <Input
            id="quantidade_insumo"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0"
            className="text-sm"
            {...form.register('quantidade', { valueAsNumber: true })}
          />
          {errors.quantidade && (
            <p className="text-xs text-red-400">{errors.quantidade.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? 'Adicionando...' : 'Adicionar Insumo'}
      </Button>
    </form>
  );
}
