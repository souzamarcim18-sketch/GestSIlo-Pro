'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];

interface ProdutoAutocompleteProps {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  produtos: ProdutoRow[];
  placeholder?: string;
}

export default function ProdutoAutocomplete({
  label = 'Produto',
  value,
  onChange,
  produtos,
  placeholder = 'Buscar produto...',
}: ProdutoAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = produtos.find((p) => p.id === value);

  const filtered = query
    ? produtos.filter((p) => p.nome.toLowerCase().includes(query.toLowerCase()))
    : produtos;

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
        className="flex items-center border rounded-md px-3 py-2 text-sm cursor-pointer bg-background"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn('flex-1', !selected && 'text-muted-foreground')}>
          {selected ? `${selected.nome} (${selected.estoque_atual} ${selected.unidade})` : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {open && (
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
              <p className="text-sm text-muted-foreground text-center py-3">Nenhum produto encontrado.</p>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', p.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span>{p.nome}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.estoque_atual} {p.unidade}
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
