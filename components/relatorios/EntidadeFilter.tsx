'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface EntidadeOption {
  id: string;
  nome: string;
}

export interface EntidadeFilterProps {
  /** Rótulo exibido antes do seletor (ex: "Silo", "Máquina"). */
  label: string;
  /** Lista de entidades selecionáveis. */
  opcoes: EntidadeOption[];
  /** Valor selecionado: 'todos' ou o id de uma entidade. */
  value: string;
  onChange: (value: string) => void;
  /** Texto da opção "todos" (ex: "Todos os silos"). */
  todosLabel: string;
  className?: string;
}

export const ENTIDADE_TODOS = 'todos';

/**
 * Seletor reutilizável "Todos / entidade específica" para filtrar relatórios
 * por silo, máquina, talhão, insumo, produto, pastagem, colaborador, etc.
 */
export function EntidadeFilter({
  label,
  opcoes,
  value,
  onChange,
  todosLabel,
  className,
}: EntidadeFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="h-8 text-sm w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ENTIDADE_TODOS} className="text-sm">
            {todosLabel}
          </SelectItem>
          {opcoes.map((o) => (
            <SelectItem key={o.id} value={o.id} className="text-sm">
              {o.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
