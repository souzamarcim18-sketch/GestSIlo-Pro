'use client';

import { cn } from '@/lib/utils';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleButtonGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * Grupo de botões mutuamente exclusivos para escolhas curtas (2 a 4 opções).
 * Mais rápido de selecionar que uma lista suspensa — usado em sexo, tipo de
 * rebanho e origem nos cadastros de rebanho.
 */
export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className,
}: ToggleButtonGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
