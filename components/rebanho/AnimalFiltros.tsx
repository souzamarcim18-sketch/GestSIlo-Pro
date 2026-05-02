'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Lote } from '@/lib/types/rebanho';

interface AnimalFiltrosProps {
  lotes: Lote[];
  onFilterChange: (filtros: {
    status?: string;
    lote_id?: string;
    busca?: string;
  }) => void;
}

export function AnimalFiltros({ lotes, onFilterChange }: AnimalFiltrosProps) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [loteId, setLoteId] = useState('');

  const handleFilterChange = useCallback(() => {
    onFilterChange({
      ...(busca && { busca }),
      ...(status && { status }),
      ...(loteId && { lote_id: loteId }),
    });
  }, [busca, status, loteId, onFilterChange]);

  const handleLimpar = useCallback(() => {
    setBusca('');
    setStatus('');
    setLoteId('');
    onFilterChange({});
  }, [onFilterChange]);

  const hasFilters = busca || status || loteId;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Buscar por Brinco</label>
          <Input
            placeholder="Digite o brinco..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyUp={handleFilterChange}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v || '')}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Morto">Morto</SelectItem>
              <SelectItem value="Vendido">Vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Lote</label>
          <Select value={loteId} onValueChange={(v) => setLoteId(v || '')}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {lotes.map((lote) => (
                <SelectItem key={lote.id} value={lote.id}>
                  {lote.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleFilterChange}
          className="flex-1 md:flex-none"
        >
          Filtrar
        </Button>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLimpar}
            className="flex-1 md:flex-none"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
