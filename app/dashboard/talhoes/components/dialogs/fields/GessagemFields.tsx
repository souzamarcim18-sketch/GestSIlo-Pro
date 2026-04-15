'use client';

import { Controller, FieldValues, Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GessagemFieldsProps {
  control: any;
  errors: any;
}

export function GessagemFields({ control, errors }: GessagemFieldsProps) {
  return (
    <div className="space-y-4">
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
