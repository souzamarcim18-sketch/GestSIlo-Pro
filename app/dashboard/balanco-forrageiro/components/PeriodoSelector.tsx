import { cn } from '@/lib/utils';
import type { PeriodoBalanco } from '@/lib/utils/balanco-forrageiro';

const OPCOES: { label: string; value: PeriodoBalanco }[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
];

type PeriodoSelectorProps = {
  value: PeriodoBalanco;
  onChange: (periodo: PeriodoBalanco) => void;
};

export function PeriodoSelector({ value, onChange }: PeriodoSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {OPCOES.map((op) => (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          className={cn(
            'px-3 py-1 rounded-md text-sm font-medium transition-all duration-150',
            value === op.value
              ? 'bg-[rgba(0,196,90,0.15)] text-[#00c45a] border border-[rgba(0,196,90,0.25)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}
