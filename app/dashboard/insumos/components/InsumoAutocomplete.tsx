'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check } from 'lucide-react';
import { useInsumosSearch } from '@/lib/hooks/useInsumos';
import { cn } from '@/lib/utils';
import type { Insumo } from '@/types/insumos';

interface InsumoAutocompleteProps {
  value: string;
  onChange: (insumoId: string) => void;
  label?: string;
  placeholder?: string;
  insumos?: Insumo[];
  onCreateNew?: (termo: string) => void;
}

export default function InsumoAutocomplete({
  value,
  onChange,
  label = 'Insumo',
  placeholder = 'Buscar insumo...',
  insumos = [],
  onCreateNew,
}: InsumoAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Hook com debounce 300ms
  const { data: searchResults = [] } = useInsumosSearch(searchTerm);

  const selectedInsumo = insumos.find(i => i.id === value);

  // Combinar resultados da busca com insumos passados
  const allResults = searchTerm
    ? searchResults
    : insumos.filter(i => i.ativo).slice(0, 10);

  // Verificar se tem match exato
  const hasExactMatch = allResults.some(i =>
    i.nome.toLowerCase().trim() === searchTerm.toLowerCase().trim()
  );

  const handleCreateNew = () => {
    if (searchTerm.trim() && onCreateNew) {
      onCreateNew(searchTerm.trim());
      setSearchTerm('');
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedInsumo ? (
              <>
                {selectedInsumo.nome}
                <span className="text-xs text-muted-foreground ml-2">
                  ({selectedInsumo.estoque_atual} {selectedInsumo.unidade})
                </span>
              </>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3 py-2">
              <Input
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <CommandList>
              {allResults.length === 0 && searchTerm ? (
                <CommandEmpty>
                  <div className="py-2 text-sm">
                    Nenhum insumo encontrado.
                    {onCreateNew && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCreateNew}
                        className="w-full justify-start text-primary mt-1"
                      >
                        ➕ Criar &quot;{searchTerm}&quot;
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {allResults.map((insumo) => (
                    <CommandItem
                      key={insumo.id}
                      value={insumo.id}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? '' : currentValue);
                        setOpen(false);
                        setSearchTerm('');
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{insumo.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {insumo.estoque_atual} {insumo.unidade}
                          {insumo.estoque_minimo && (
                            <span className="ml-2">
                              (mín: {insumo.estoque_minimo})
                            </span>
                          )}
                        </div>
                      </div>
                      {value === insumo.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}

                  {/* Opção "Criar novo" ao final se não houver match exato */}
                  {searchTerm && !hasExactMatch && onCreateNew && (
                    <CommandItem
                      onSelect={handleCreateNew}
                      className="text-primary flex items-center gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">Criar novo insumo</div>
                        <div className="text-xs text-muted-foreground">
                          &quot;{searchTerm}&quot;
                        </div>
                      </div>
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
