'use client';

import { useEffect } from 'react';
import { Controller, FieldValues, Control, type UseFormSetValue } from 'react-hook-form';
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
import type { Insumo } from '@/lib/supabase';

const CATEGORIAS_PULVERIZACAO = [
  'Herbicida',
  'Inseticida',
  'Fungicida',
  'Fertilizante Foliar',
  'Outros',
];

/**
 * Deriva a unidade de dose (L/ha ou kg/ha) a partir da unidade cadastrada do
 * insumo. Produtos líquidos (L, litro, mL) → L/ha; sólidos (kg, g) → kg/ha.
 */
function unidadeDoseDoInsumo(unidade?: string): 'L/ha' | 'kg/ha' {
  if (!unidade) return 'L/ha';
  const u = unidade.toLowerCase();
  if (u.includes('l') || u.includes('litro') || u.includes('ml')) return 'L/ha';
  return 'kg/ha';
}

interface PulverizacaoFieldsProps {
  control: Control<FieldValues>;
  errors: FieldValues;
  insumos: Insumo[];
  watch?: (name: string) => unknown;
  setValue?: UseFormSetValue<FieldValues>;
}

export function PulverizacaoFields({
  control,
  errors,
  insumos,
  watch,
  setValue,
}: PulverizacaoFieldsProps) {
  const insumoId = watch?.('insumo_id') as string | undefined;
  const insumoSelecionado = insumos.find((i) => i.id === insumoId);
  const unidadeDose = unidadeDoseDoInsumo(insumoSelecionado?.unidade);

  // A unidade da dose é herdada do insumo cadastrado, não escolhida à mão.
  useEffect(() => {
    if (insumoSelecionado && setValue) {
      setValue('dose_unidade', unidadeDose, { shouldValidate: false });
    }
  }, [insumoSelecionado, unidadeDose, setValue]);

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
        <Label htmlFor="insumo_id">Produto (do estoque)</Label>
        <Controller
          name="insumo_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="insumo_id">
                <SelectValue placeholder="Selecione o produto" />
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dose_valor">Dose ({unidadeDose})</Label>
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
                value={field.value ?? ''}
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
                value={field.value ?? ''}
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
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex gap-2">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-200">
          A unidade da dose ({unidadeDose}) é definida pela unidade do produto no
          estoque. Para misturas de calda com múltiplos produtos, registre cada
          produto como uma atividade separada na mesma data.
        </p>
      </div>
    </div>
  );
}
