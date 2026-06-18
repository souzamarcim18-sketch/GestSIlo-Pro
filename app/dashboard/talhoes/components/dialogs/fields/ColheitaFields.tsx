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
import { Checkbox } from '@/components/ui/checkbox';
import type { Maquina } from '@/lib/supabase';
import { culturaPossuiRebrota } from '../../../helpers';

const NENHUMA = '__none__';

interface ColheitaFieldsProps {
  control: Control<FieldValues>;
  errors: FieldValues;
  maquinas: Maquina[];
  watch?: (name: string) => unknown;
  culturaAtiva?: string;
}

interface MaquinaSelectProps {
  control: Control<FieldValues>;
  name: string;
  id: string;
  maquinas: Maquina[];
}

function MaquinaSelect({ control, name, id, maquinas }: MaquinaSelectProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Select
          value={field.value || NENHUMA}
          onValueChange={(v) => field.onChange(v === NENHUMA ? null : v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Opcional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUMA}>Nenhuma</SelectItem>
            {maquinas.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function ColheitaFields({
  control,
  errors,
  maquinas,
  culturaAtiva,
}: ColheitaFieldsProps) {
  const permiteRebrota = culturaAtiva ? culturaPossuiRebrota(culturaAtiva) : false;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="produtividade_ton_ha">Produtividade (ton/ha)</Label>
        <Controller
          name="produtividade_ton_ha"
          control={control}
          render={({ field }) => (
            <Input
              id="produtividade_ton_ha"
              type="number"
              step="0.1"
              placeholder="0.0"
              {...field}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(e.target.valueAsNumber || undefined)
              }
            />
          )}
        />
        {errors.produtividade_ton_ha && (
          <p className="text-sm text-destructive">
            {errors.produtividade_ton_ha.message}
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium text-sm mb-4">Máquinas de Colheita</h4>

        <div className="space-y-4">
          {/* Máquina de Colheita */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="maquina_colheita_id" className="text-sm">
                Colheitadeira
              </Label>
              <MaquinaSelect
                control={control}
                name="maquina_colheita_id"
                id="maquina_colheita_id"
                maquinas={maquinas}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_colheita" className="text-sm">
                Horas
              </Label>
              <Controller
                name="horas_colheita"
                control={control}
                render={({ field }) => (
                  <Input
                    id="horas_colheita"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber || undefined)
                    }
                  />
                )}
              />
            </div>
          </div>

          {/* Máquina de Transporte */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="maquina_transporte_id" className="text-sm">
                Transporte
              </Label>
              <MaquinaSelect
                control={control}
                name="maquina_transporte_id"
                id="maquina_transporte_id"
                maquinas={maquinas}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_transporte" className="text-sm">
                Horas
              </Label>
              <Controller
                name="horas_transporte"
                control={control}
                render={({ field }) => (
                  <Input
                    id="horas_transporte"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber || undefined)
                    }
                  />
                )}
              />
            </div>
          </div>

          {/* Máquina de Compactação */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="maquina_compactacao_id" className="text-sm">
                Compactação
              </Label>
              <MaquinaSelect
                control={control}
                name="maquina_compactacao_id"
                id="maquina_compactacao_id"
                maquinas={maquinas}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_compactacao" className="text-sm">
                Horas
              </Label>
              <Controller
                name="horas_compactacao"
                control={control}
                render={({ field }) => (
                  <Input
                    id="horas_compactacao"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber || undefined)
                    }
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor_terceirizacao_r">
          Valor Terceirização (R$)
        </Label>
        <Controller
          name="valor_terceirizacao_r"
          control={control}
          render={({ field }) => (
            <Input
              id="valor_terceirizacao_r"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...field}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(e.target.valueAsNumber || undefined)
              }
            />
          )}
        />
        {errors.valor_terceirizacao_r && (
          <p className="text-sm text-destructive">
            {errors.valor_terceirizacao_r.message}
          </p>
        )}
      </div>

      {permiteRebrota && (
        <div className="border-t pt-4 space-y-3">
          <Label>Rebrota</Label>
          <div className="flex items-center gap-2">
            <Controller
              name="permite_rebrota"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="permite_rebrota"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <label htmlFor="permite_rebrota" className="text-sm cursor-pointer">
              Planeja colher a rebrota deste talhão?
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
