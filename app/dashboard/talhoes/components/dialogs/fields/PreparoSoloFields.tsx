'use client';

import { Controller, FieldValues, Control } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const TIPOS_OPERACAO_SOLO = [
  'Aração',
  'Gradagem',
  'Subsolagem',
  'Nivelamento',
  'Escarificação',
  'Roçagem',
  'Destorroamento',
];

interface PreparoSoloFieldsProps {
  control: any;
  errors: any;
}

export function PreparoSoloFields({ control, errors }: PreparoSoloFieldsProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tipo_operacao_solo">Tipo de Preparo</Label>
      <Controller
        name="tipo_operacao_solo"
        control={control}
        render={({ field }) => (
          <Select value={field.value || ''} onValueChange={field.onChange}>
            <SelectTrigger id="tipo_operacao_solo">
              <SelectValue placeholder="Selecione o tipo de preparo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_OPERACAO_SOLO.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {errors.tipo_operacao_solo && (
        <p className="text-sm text-destructive">
          {errors.tipo_operacao_solo.message}
        </p>
      )}
    </div>
  );
}
