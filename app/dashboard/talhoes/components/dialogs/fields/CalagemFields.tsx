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

const TIPOS_CALCARIO = [
  'Calcário Dolomítico',
  'Calcário Calcítico',
  'Calcário Magnesiano',
];

interface CalagemFieldsProps {
  control: any;
  errors: any;
}

export function CalagemFields({ control, errors }: CalagemFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="insumo_id">Tipo de Calcário</Label>
        <Controller
          name="insumo_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="insumo_id">
                <SelectValue placeholder="Selecione o calcário" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_CALCARIO.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.insumo_id && (
          <p className="text-sm text-destructive">{errors.insumo_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dose_ton_ha">Dose (ton/ha)</Label>
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
