'use client';

import { useState } from 'react';
import { Controller, FieldValues, Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CAMPOS_ANALISE = [
  { key: 'ph_cacl2', label: 'pH (CaCl2)' },
  { key: 'mo_g_dm3', label: 'M.O. (g/dm³)' },
  { key: 'p_mg_dm3', label: 'P (mg/dm³)' },
  { key: 'k_mmolc_dm3', label: 'K (mmol/dm³)' },
  { key: 'ca_mmolc_dm3', label: 'Ca (mmol/dm³)' },
  { key: 'mg_mmolc_dm3', label: 'Mg (mmol/dm³)' },
  { key: 'al_mmolc_dm3', label: 'Al (mmol/dm³)' },
  { key: 'h_al_mmolc_dm3', label: 'H+Al (mmol/dm³)' },
  { key: 's_mg_dm3', label: 'S (mg/dm³)' },
  { key: 'b_mg_dm3', label: 'B (mg/dm³)' },
  { key: 'cu_mg_dm3', label: 'Cu (mg/dm³)' },
  { key: 'fe_mg_dm3', label: 'Fe (mg/dm³)' },
  { key: 'mn_mg_dm3', label: 'Mn (mg/dm³)' },
  { key: 'zn_mg_dm3', label: 'Zn (mg/dm³)' },
];

interface AnaliseSoloFieldsProps {
  control: any;
  errors: any;
  watch?: any;
}

export function AnaliseSoloFields({
  control,
  errors,
  watch,
}: AnaliseSoloFieldsProps) {
  const metodoEntrada = watch?.('metodo_entrada') || 'Manual';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="custo_amostra_r">Custo da Amostra (R$)</Label>
        <Controller
          name="custo_amostra_r"
          control={control}
          render={({ field }) => (
            <Input
              id="custo_amostra_r"
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodo_entrada">Método de Entrada</Label>
        <Controller
          name="metodo_entrada"
          control={control}
          render={({ field }) => (
            <Select value={field.value || 'Manual'} onValueChange={field.onChange}>
              <SelectTrigger id="metodo_entrada">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="Upload PDF">Upload PDF</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {metodoEntrada === 'Manual' && (
        <div className="border-t pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Preencha os valores da análise de solo:
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {CAMPOS_ANALISE.map((campo) => (
              <div key={campo.key} className="space-y-1">
                <Label htmlFor={campo.key} className="text-xs">
                  {campo.label}
                </Label>
                <Controller
                  name={campo.key}
                  control={control}
                  render={({ field }) => (
                    <Input
                      id={campo.key}
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="text-xs h-8"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || undefined)
                      }
                    />
                  )}
                />
                {errors[campo.key] && (
                  <p className="text-xs text-destructive">
                    {errors[campo.key].message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {metodoEntrada === 'Upload PDF' && (
        <div className="border-t pt-4 space-y-2">
          <Label htmlFor="url_pdf_analise">Arquivo PDF</Label>
          <Controller
            name="url_pdf_analise"
            control={control}
            render={({ field }) => (
              <Input
                id="url_pdf_analise"
                type="file"
                accept=".pdf"
                className="h-10"
                {...field}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  field.onChange(file);
                }}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Upload de PDF com análise de solo (opcional)
          </p>
        </div>
      )}
    </div>
  );
}
