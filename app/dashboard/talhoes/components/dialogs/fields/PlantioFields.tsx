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

interface PlantioFieldsProps {
  control: Control<FieldValues>;
  errors: FieldValues;
  /** Insumos selecionáveis no plantio: sementes (padrão) ou mudas (culturas vegetativas). */
  sementes?: Insumo[];
  /** Quando true, a cultura é propagada por muda/tolete — rótulos e campos se adaptam. */
  usaMudas?: boolean;
}

export function PlantioFields({ control, errors, sementes = [], usaMudas = false }: PlantioFieldsProps) {
  const rotuloInsumo = usaMudas ? 'Muda' : 'Semente';
  const placeholderVazio = usaMudas
    ? 'Nenhuma muda no estoque'
    : 'Nenhuma semente no estoque';
  const placeholderSelecionar = usaMudas ? 'Selecione a muda' : 'Selecione a semente';
  const mensagemVazio = usaMudas
    ? 'Nenhuma muda cadastrada no estoque'
    : 'Nenhuma semente cadastrada no estoque';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="semente_id">{rotuloInsumo}</Label>
        <Controller
          name="semente_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="semente_id">
                <SelectValue placeholder={sementes.length === 0 ? placeholderVazio : placeholderSelecionar} />
              </SelectTrigger>
              <SelectContent>
                {sementes.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    {mensagemVazio}
                  </SelectItem>
                ) : (
                  sementes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} ({s.estoque_atual} {s.unidade} disponíveis)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        {errors.semente_id && (
          <p className="text-sm text-destructive">{errors.semente_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* População de plantas/ha não se aplica ao plantio vegetativo (mudas). */}
        {!usaMudas && (
          <div className="space-y-2">
            <Label htmlFor="populacao_plantas_ha">População (plantas/ha)</Label>
            <Controller
              name="populacao_plantas_ha"
              control={control}
              render={({ field }) => (
                <Input
                  id="populacao_plantas_ha"
                  type="number"
                  step="1000"
                  placeholder="0"
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.valueAsNumber || undefined)
                  }
                />
              )}
            />
            {errors.populacao_plantas_ha && (
              <p className="text-sm text-destructive">
                {errors.populacao_plantas_ha.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sacos_ha">{usaMudas ? 'Mudas/toletes por ha' : 'Sacos/ha'}</Label>
          <Controller
            name="sacos_ha"
            control={control}
            render={({ field }) => (
              <Input
                id="sacos_ha"
                type="number"
                step={usaMudas ? '1' : '0.1'}
                placeholder={usaMudas ? '0' : '0.0'}
                {...field}
                onChange={(e) =>
                  field.onChange(e.target.valueAsNumber || undefined)
                }
              />
            )}
          />
          {errors.sacos_ha && (
            <p className="text-sm text-destructive">
              {errors.sacos_ha.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="espacamento_entre_linhas_cm">
          Espaçamento entre linhas (cm)
        </Label>
        <Controller
          name="espacamento_entre_linhas_cm"
          control={control}
          render={({ field }) => (
            <Input
              id="espacamento_entre_linhas_cm"
              type="number"
              step="1"
              placeholder="0"
              {...field}
              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
            />
          )}
        />
        {errors.espacamento_entre_linhas_cm && (
          <p className="text-sm text-destructive">
            {errors.espacamento_entre_linhas_cm.message}
          </p>
        )}
      </div>
    </div>
  );
}
