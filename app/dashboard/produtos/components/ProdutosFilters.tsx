'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Database } from '@/types/supabase';

type CategoriaProdutoRow = Database['public']['Tables']['categorias_produto']['Row'];

export interface ProdutosFiltersState {
  busca: string;
  categoria_id: string;
  status: string;
}

interface ProdutosFiltersProps {
  filters: ProdutosFiltersState;
  onChange: (filters: Partial<ProdutosFiltersState>) => void;
  onReset: () => void;
  categorias: CategoriaProdutoRow[];
}

export default function ProdutosFilters({
  filters,
  onChange,
  onReset,
  categorias,
}: ProdutosFiltersProps) {
  const hasActiveFilters = filters.busca || filters.categoria_id || filters.status;

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Filtros</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="busca-produto" className="text-xs font-medium">
            Buscar por Nome
          </Label>
          <Input
            id="busca-produto"
            placeholder="Digite..."
            value={filters.busca}
            onChange={(e) => onChange({ busca: e.target.value })}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="categoria-produto" className="text-xs font-medium">
            Categoria
          </Label>
          <Select
            value={filters.categoria_id}
            onValueChange={(value) => onChange({ categoria_id: value === '__all__' ? '' : (value ?? '') })}
          >
            <SelectTrigger id="categoria-produto" className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="status-produto" className="text-xs font-medium">
            Status Estoque
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onChange({ status: value === '__all__' ? '' : (value ?? '') })
            }
          >
            <SelectTrigger id="status-produto" className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
