'use client';

import { Controller, FieldValues, Control } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Insumo } from '@/lib/supabase';

interface AdubacaoFieldsProps {
  control: Control<FieldValues>;
  errors: FieldValues;
  insumos: Insumo[];
  watch?: (name: string) => unknown;
}

export function AdubacaoFields({ control, errors, insumos, watch }: AdubacaoFieldsProps) {
  const insumoId = watch?.('insumo_id') as string | undefined;
  const insumoSelecionado = insumos.find((i) => i.id === insumoId);
  const unidade = insumoSelecionado?.unidade ?? 'kg';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="insumo_id">Fertilizante (do estoque)</Label>
        <Controller
          name="insumo_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="insumo_id">
                <SelectValue placeholder="Selecione o adubo" />
              </SelectTrigger>
              <SelectContent>
                {insumos.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhum insumo cadastrado no estoque
                  </div>
                ) : (
                  insumos.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} ({i.unidade})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        {errors.insumo_id && (
          <p className="text-sm text-destructive">{errors.insumo_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dose_ton_ha">Dose ({unidade}/ha)</Label>
        <Controller
          name="dose_ton_ha"
          control={control}
          render={({ field }) => (
            <Input
              id="dose_ton_ha"
              type="number"
              step="0.1"
              placeholder="0.0"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
            />
          )}
        />
        {errors.dose_ton_ha && (
          <p className="text-sm text-destructive">
            {errors.dose_ton_ha.message}
          </p>
        )}
      </div>
    </div>
  );
}
