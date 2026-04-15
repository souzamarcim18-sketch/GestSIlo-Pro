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

const MAQUINAS_EXEMPLO = [
  'Colheitadeira 01',
  'Colheitadeira 02',
  'Transporte 01',
  'Transporte 02',
  'Compactador 01',
];

interface ColheitaFieldsProps {
  control: any;
  errors: any;
  watch?: any;
  culturaAtiva?: string;
}

export function ColheitaFields({
  control,
  errors,
  watch,
  culturaAtiva,
}: ColheitaFieldsProps) {
  const ehSorgoSilagem = culturaAtiva?.toLowerCase().includes('sorgo silagem');

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
              <Label htmlFor="maquina_colheita_id" className="text-xs">
                Colheitadeira
              </Label>
              <Controller
                name="maquina_colheita_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="maquina_colheita_id" className="text-xs">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {MAQUINAS_EXEMPLO.filter((m) =>
                        m.toLowerCase().includes('colheita')
                      ).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_colheita" className="text-xs">
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
                    className="text-xs"
                    {...field}
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
              <Label htmlFor="maquina_transporte_id" className="text-xs">
                Transporte
              </Label>
              <Controller
                name="maquina_transporte_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="maquina_transporte_id"
                      className="text-xs"
                    >
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {MAQUINAS_EXEMPLO.filter((m) =>
                        m.toLowerCase().includes('transporte')
                      ).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_transporte" className="text-xs">
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
                    className="text-xs"
                    {...field}
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
              <Label htmlFor="maquina_compactacao_id" className="text-xs">
                Compactação
              </Label>
              <Controller
                name="maquina_compactacao_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="maquina_compactacao_id"
                      className="text-xs"
                    >
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {MAQUINAS_EXEMPLO.filter((m) =>
                        m.toLowerCase().includes('compactador')
                      ).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_compactacao" className="text-xs">
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
                    className="text-xs"
                    {...field}
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

      {ehSorgoSilagem && (
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
              Planeja colher rebrota? (~60 dias)
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
