'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InsumoOption {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
}

interface InsumoAutocompleteProps {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  insumos: InsumoOption[];
  placeholder?: string;
  disabled?: boolean;
}

export default function InsumoAutocomplete({
  label = 'Insumo',
  value,
  onChange,
  insumos,
  placeholder = 'Buscar insumo...',
  disabled = false,
}: InsumoAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = insumos.find((i) => i.id === value);

  const filtered = query
    ? insumos.filter((i) => i.nome.toLowerCase().includes(query.toLowerCase()))
    : insumos;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && <Label className="text-sm mb-1 block">{label}</Label>}
      <div
        className={cn(
          'flex items-center border rounded-md px-3 py-2 text-sm bg-background',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={cn('flex-1', !selected && 'text-muted-foreground')}>
          {selected ? `${selected.nome} (${selected.unidade})` : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <Input
              autoFocus
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Nenhum insumo encontrado.</p>
            ) : (
              filtered.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => {
                    onChange(i.id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', i.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span>{i.nome}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {i.estoque_atual} {i.unidade}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
