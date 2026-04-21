'use client';

import { Controller } from 'react-hook-form';
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
  control: any;
  errors: any;
  sementes?: Insumo[];
}

export function PlantioFields({ control, errors, sementes = [] }: PlantioFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="semente_id">Semente</Label>
        <Controller
          name="semente_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="semente_id">
                <SelectValue placeholder={sementes.length === 0 ? 'Nenhuma semente no estoque' : 'Selecione a semente'} />
              </SelectTrigger>
              <SelectContent>
                {sementes.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Nenhuma semente cadastrada no estoque
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

        <div className="space-y-2">
          <Label htmlFor="sacos_ha">Sacos/ha</Label>
          <Controller
            name="sacos_ha"
            control={control}
            render={({ field }) => (
              <Input
                id="sacos_ha"
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
