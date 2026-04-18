'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { CategoriaInsumo } from '@/types/insumos';

export interface InsumosFiltersState {
  busca: string;
  categoria_id: string;
  tipo_id: string;
}

interface InsumosFiltersProps {
  filters: InsumosFiltersState;
  onChange: (filters: Partial<InsumosFiltersState>) => void;
  onReset: () => void;
  categorias: CategoriaInsumo[];
  insumos?: Array<{ id: string; categoria_id?: string; tipo_id?: string; tipo?: { id: string; nome: string } }>;
}

export default function InsumosFilters({
  filters,
  onChange,
  onReset,
  categorias,
  insumos = [],
}: InsumosFiltersProps) {
  const hasActiveFilters = filters.busca || filters.categoria_id || filters.tipo_id;

  // Extrair tipos únicos disponíveis (do relacionamento)
  const tiposMap = new Map<string, { id: string; nome: string }>();
  insumos.forEach(insumo => {
    if (insumo.tipo && !tiposMap.has(insumo.tipo.id)) {
      tiposMap.set(insumo.tipo.id, insumo.tipo);
    }
  });

  // Filtrar tipos conforme categoria selecionada
  const tiposDisponiveis = filters.categoria_id === ''
    ? Array.from(tiposMap.values())
    : insumos
        .filter(i => i.categoria_id === filters.categoria_id && i.tipo)
        .map(i => i.tipo!)
        .filter((tipo, idx, self) => self.findIndex(t => t.id === tipo.id) === idx);

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Filtros</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {/* Busca */}
        <div className="space-y-1">
          <Label htmlFor="busca" className="text-xs font-medium">
            Buscar por Nome
          </Label>
          <Input
            id="busca"
            placeholder="Digite..."
            value={filters.busca}
            onChange={(e) => onChange({ busca: e.target.value })}
            className="h-9"
          />
        </div>

        {/* Categoria */}
        <div className="space-y-1">
          <Label htmlFor="categoria" className="text-xs font-medium">
            Categoria
          </Label>
          <Select
            value={filters.categoria_id}
            onValueChange={(value) => {
              onChange({ categoria_id: value || '', tipo_id: '' }); // Reset tipo ao mudar categoria
            }}
          >
            <SelectTrigger id="categoria" className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="space-y-1">
          <Label htmlFor="tipo" className="text-xs font-medium">
            Tipo
          </Label>
          <Select
            value={filters.tipo_id}
            onValueChange={(value) => onChange({ tipo_id: value || '' })}
            disabled={!filters.categoria_id && tiposDisponiveis.length === 0}
          >
            <SelectTrigger id="tipo" className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {tiposDisponiveis.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
