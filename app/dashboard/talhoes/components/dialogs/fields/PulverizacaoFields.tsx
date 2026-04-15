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
import { AlertCircle } from 'lucide-react';

const CATEGORIAS_PULVERIZACAO = [
  'Herbicida',
  'Inseticida',
  'Fungicida',
  'Fertilizante Foliar',
  'Adjuvante',
  'Outro',
];

const PRODUTOS_POR_CATEGORIA: Record<string, string[]> = {
  Herbicida: ['Glifosato', 'Atrazina', 'Nicosulfuron', 'Flumioxazin'],
  Inseticida: ['Fipronil', 'Lambda-cialotrina', 'Tiametoxam', 'Espiromesifeno'],
  Fungicida: ['Azoxistrobina', 'Trifloxistrobina', 'Piraclostrobina', 'Benomila'],
  'Fertilizante Foliar': [
    'Fertilizante Foliar 10-10-10',
    'Fertilizante Foliar 20-20-20',
    'Uréia Foliar',
  ],
  Adjuvante: ['Óleo Mineral', 'Espalhante Adesivo', 'Acidificante'],
  Outro: ['Outro'],
};

const UNIDADES_POR_CATEGORIA: Record<string, string[]> = {
  Herbicida: ['L/ha', 'mL/ha'],
  Inseticida: ['L/ha', 'mL/ha'],
  Fungicida: ['L/ha', 'mL/ha', 'kg/ha'],
  'Fertilizante Foliar': ['L/ha', 'kg/ha'],
  Adjuvante: ['L/ha', 'mL/ha'],
  Outro: ['L/ha', 'kg/ha'],
};

interface PulverizacaoFieldsProps {
  control: any;
  errors: any;
  watch?: any;
}

export function PulverizacaoFields({
  control,
  errors,
  watch,
}: PulverizacaoFieldsProps) {
  const categoria = watch?.('categoria_pulverizacao');
  const produtosDisponiveis = categoria
    ? PRODUTOS_POR_CATEGORIA[categoria] || []
    : [];
  const unidadesDisponiveis = categoria
    ? UNIDADES_POR_CATEGORIA[categoria] || []
    : [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="categoria_pulverizacao">Categoria</Label>
        <Controller
          name="categoria_pulverizacao"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="categoria_pulverizacao">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_PULVERIZACAO.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoria_pulverizacao && (
          <p className="text-sm text-destructive">
            {errors.categoria_pulverizacao.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="insumo_id">Produto</Label>
        <Controller
          name="insumo_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="insumo_id">
                <SelectValue
                  placeholder={
                    categoria ? 'Selecione o produto' : 'Selecione uma categoria'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {produtosDisponiveis.map((produto) => (
                  <SelectItem key={produto} value={produto}>
                    {produto}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dose_valor">Dose</Label>
          <Controller
            name="dose_valor"
            control={control}
            render={({ field }) => (
              <Input
                id="dose_valor"
                type="number"
                step="0.01"
                placeholder="0.0"
                {...field}
                onChange={(e) =>
                  field.onChange(e.target.valueAsNumber || undefined)
                }
              />
            )}
          />
          {errors.dose_valor && (
            <p className="text-sm text-destructive">
              {errors.dose_valor.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dose_unidade">Unidade</Label>
          <Controller
            name="dose_unidade"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger id="dose_unidade">
                  <SelectValue placeholder="L/ha" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesDisponiveis.map((unidade) => (
                    <SelectItem key={unidade} value={unidade}>
                      {unidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.dose_unidade && (
            <p className="text-sm text-destructive">
              {errors.dose_unidade.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="volume_calda_l_ha">Volume de Calda (L/ha)</Label>
        <Controller
          name="volume_calda_l_ha"
          control={control}
          render={({ field }) => (
            <Input
              id="volume_calda_l_ha"
              type="number"
              step="10"
              placeholder="0"
              {...field}
              onChange={(e) =>
                field.onChange(e.target.valueAsNumber || undefined)
              }
            />
          )}
        />
        {errors.volume_calda_l_ha && (
          <p className="text-sm text-destructive">
            {errors.volume_calda_l_ha.message}
          </p>
        )}
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex gap-2">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-200">
          Para misturas de calda com múltiplos produtos, registre cada produto
          como uma atividade separada na mesma data.
        </p>
      </div>
    </div>
  );
}
