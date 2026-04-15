'use client';

import { Controller, FieldValues, Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IrrigacaoFieldsProps {
  control: any;
  errors: any;
}

export function IrrigacaoFields({ control, errors }: IrrigacaoFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lamina_mm">Lâmina (mm)</Label>
        <Controller
          name="lamina_mm"
          control={control}
          render={({ field }) => (
            <Input
              id="lamina_mm"
              type="number"
              step="1"
              placeholder="0"
              {...field}
              onChange={(e) =>
                field.onChange(e.target.valueAsNumber || undefined)
              }
            />
          )}
        />
        {errors.lamina_mm && (
          <p className="text-sm text-destructive">{errors.lamina_mm.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="horas_irrigacao">Horas de Irrigação</Label>
          <Controller
            name="horas_irrigacao"
            control={control}
            render={({ field }) => (
              <Input
                id="horas_irrigacao"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...field}
                onChange={(e) =>
                  field.onChange(e.target.valueAsNumber || undefined)
                }
              />
            )}
          />
          {errors.horas_irrigacao && (
            <p className="text-sm text-destructive">
              {errors.horas_irrigacao.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="custo_por_hora_r">Custo/hora (R$)</Label>
          <Controller
            name="custo_por_hora_r"
            control={control}
            render={({ field }) => (
              <Input
                id="custo_por_hora_r"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...field}
                onChange={(e) =>
                  field.onChange(e.target.valueAsNumber || undefined)
                }
              />
            )}
          />
          {errors.custo_por_hora_r && (
            <p className="text-sm text-destructive">
              {errors.custo_por_hora_r.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
