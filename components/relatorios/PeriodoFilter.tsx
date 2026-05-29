'use client';

import { useState } from 'react';
import { startOfMonth, startOfYear, subDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export type PeriodoPreset =
  | 'mes_atual'
  | 'ultimos_30'
  | 'ultimos_60'
  | 'ultimos_90'
  | 'ultimos_180'
  | 'ultimos_365'
  | 'ano_corrente'
  | 'personalizado';

export interface PeriodoFilterProps {
  value: { from: Date; to: Date };
  onChange: (periodo: { from: Date; to: Date }) => void;
  defaultPreset?: PeriodoPreset;
  className?: string;
}

function calcularPeriodo(preset: PeriodoPreset): { from: Date; to: Date } | null {
  const hoje = new Date();
  switch (preset) {
    case 'mes_atual':
      return { from: startOfMonth(hoje), to: hoje };
    case 'ultimos_30':
      return { from: subDays(hoje, 30), to: hoje };
    case 'ultimos_60':
      return { from: subDays(hoje, 60), to: hoje };
    case 'ultimos_90':
      return { from: subDays(hoje, 90), to: hoje };
    case 'ultimos_180':
      return { from: subDays(hoje, 180), to: hoje };
    case 'ultimos_365':
      return { from: subDays(hoje, 365), to: hoje };
    case 'ano_corrente':
      return { from: startOfYear(hoje), to: hoje };
    default:
      return null;
  }
}

const PRESET_LABELS: Record<PeriodoPreset, string> = {
  mes_atual: 'Mês atual',
  ultimos_30: 'Últimos 30 dias',
  ultimos_60: 'Últimos 60 dias',
  ultimos_90: 'Últimos 90 dias',
  ultimos_180: 'Últimos 6 meses',
  ultimos_365: 'Últimos 12 meses',
  ano_corrente: 'Ano corrente',
  personalizado: 'Personalizado',
};

export function PeriodoFilter({ value, onChange, defaultPreset, className }: PeriodoFilterProps) {
  const [preset, setPreset] = useState<PeriodoPreset>(defaultPreset ?? 'ultimos_30');
  const [range, setRange] = useState<DateRange | undefined>({ from: value.from, to: value.to });
  const [open, setOpen] = useState(false);

  const handlePresetChange = (val: string | null) => {
    if (!val) return;
    const p = val as PeriodoPreset;
    setPreset(p);
    if (p !== 'personalizado') {
      const periodo = calcularPeriodo(p);
      if (periodo) {
        setRange({ from: periodo.from, to: periodo.to });
        onChange(periodo);
      }
    }
  };

  const handleRangeSelect = (r: DateRange | undefined) => {
    setRange(r);
    if (r?.from && r?.to) {
      onChange({ from: r.from, to: r.to });
      setOpen(false);
    }
  };

  const displayLabel =
    preset !== 'personalizado'
      ? PRESET_LABELS[preset]
      : range?.from && range?.to
        ? `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} – ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`
        : 'Selecionar datas';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] text-sm">
          <SelectValue>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABELS) as PeriodoPreset[]).map((p) => (
            <SelectItem key={p} value={p} className="text-sm">
              {PRESET_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'personalizado' && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
            <CalendarIcon className="h-3 w-3" aria-hidden="true" />
            {range?.from && range?.to
              ? `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} – ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`
              : 'Selecionar datas'}
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleRangeSelect}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
