'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  FiltrosIndicadores,
  FiltrosIndicadoresProps,
  PeriodoPreset,
} from '@/types/rebanho-indicadores';

const CATEGORIAS_DISPONIVEIS = [
  'Bezerra',
  'Vaca',
  'Novilha',
  'Touro',
  'Touril',
  'Boi',
  'Novilho',
];

export function FiltrosIndicadores({
  filtrosAtuais,
  tipoExploracao,
  onAplicar,
  onResetar,
  lotes,
  isLoading = false,
}: FiltrosIndicadoresProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Carregar estado inicial do sessionStorage ou filtrosAtuais
  const [filtersState] = useState(() => {
    const filtrosStorage = sessionStorage.getItem('filtros-indicadores');
    if (filtrosStorage) {
      try {
        const parsed = JSON.parse(filtrosStorage);
        return {
          periodo: parsed.periodo || filtrosAtuais.periodo,
          dataInicio: parsed.dataInicio || '',
          dataFim: parsed.dataFim || '',
          lotes: parsed.lotes || [],
          categorias: parsed.categorias || [],
        };
      } catch {
        // Ignorar erro de parse
      }
    }

    return {
      periodo: filtrosAtuais.periodo,
      dataInicio: filtrosAtuais.dataInicio ? (typeof filtrosAtuais.dataInicio === 'string' ? filtrosAtuais.dataInicio : filtrosAtuais.dataInicio.toISOString().split('T')[0]) : '',
      dataFim: filtrosAtuais.dataFim ? (typeof filtrosAtuais.dataFim === 'string' ? filtrosAtuais.dataFim : filtrosAtuais.dataFim.toISOString().split('T')[0]) : '',
      lotes: filtrosAtuais.lotes || [],
      categorias: filtrosAtuais.categorias || [],
    };
  });

  const [periodo, setPeriodo] = useState<PeriodoPreset>(filtersState.periodo);
  const [dataInicio, setDataInicio] = useState<string>(filtersState.dataInicio);
  const [dataFim, setDataFim] = useState<string>(filtersState.dataFim);
  const [lotesSelecionados, setLotesSelecionados] = useState<string[]>(filtersState.lotes);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(filtersState.categorias);

  // Sincronizar URL com filtros
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Atualizar params com filtros atuais
    if (periodo) params.set('periodo', periodo);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);
    if (lotesSelecionados.length > 0) {
      params.set('lotes', lotesSelecionados.join(','));
    } else {
      params.delete('lotes');
    }
    if (categoriasSelecionadas.length > 0) {
      params.set('categorias', categoriasSelecionadas.join(','));
    } else {
      params.delete('categorias');
    }

    // Atualizar URL
    const newUrl = `?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // Sincronizar sessionStorage
    sessionStorage.setItem(
      'filtros-indicadores',
      JSON.stringify({
        periodo,
        dataInicio,
        dataFim,
        lotes: lotesSelecionados,
        categorias: categoriasSelecionadas,
      })
    );
  }, [periodo, dataInicio, dataFim, lotesSelecionados, categoriasSelecionadas, searchParams]);

  const handleAplicar = useCallback(async () => {
    const filtrosNovos: FiltrosIndicadores = {
      periodo,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      lotes: lotesSelecionados.length > 0 ? lotesSelecionados : undefined,
      categorias: categoriasSelecionadas.length > 0 ? categoriasSelecionadas : undefined,
    };

    await onAplicar(filtrosNovos);
  }, [periodo, dataInicio, dataFim, lotesSelecionados, categoriasSelecionadas, onAplicar]);

  const handleResetar = useCallback(() => {
    setPeriodo('90d');
    setDataInicio('');
    setDataFim('');
    setLotesSelecionados([]);
    setCategoriasSelecionadas([]);
    sessionStorage.removeItem('filtros-indicadores');
    router.push('?periodo=90d');
    onResetar();
  }, [router, onResetar]);

  const toggleLote = (loteId: string): void => {
    setLotesSelecionados((prev) =>
      prev.includes(loteId) ? prev.filter((id) => id !== loteId) : [...prev, loteId]
    );
  };

  const toggleCategoria = (categoria: string): void => {
    setCategoriasSelecionadas((prev) =>
      prev.includes(categoria)
        ? prev.filter((c) => c !== categoria)
        : [...prev, categoria]
    );
  };

  const lotesSelecionadosInfo = lotes
    .filter((l) => lotesSelecionados.includes(l.id))
    .map((l) => `${l.nome}`)
    .join(', ');

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Filtros</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Período */}
        <div className="space-y-2">
          <Label htmlFor="periodo" className="text-sm font-medium text-foreground">
            Período
          </Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoPreset)}>
            <SelectTrigger id="periodo" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
              <SelectItem value="safra">Safra agrícola</SelectItem>
              <SelectItem value="custom">Período customizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Início (custom) */}
        {periodo === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="dataInicio" className="text-sm font-medium text-foreground">
              Data Início
            </Label>
            <Input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        )}

        {/* Data Fim (custom) */}
        {periodo === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="dataFim" className="text-sm font-medium text-foreground">
              Data Fim
            </Label>
            <Input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        )}

        {/* Lotes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Lotes</Label>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-full justify-between text-sm inline-flex items-center rounded-lg border border-input bg-background px-3 py-2 hover:bg-muted disabled:opacity-50" disabled={isLoading}>
              <span className="truncate text-xs">
                {lotesSelecionados.length === 0
                  ? 'Selecionar lotes'
                  : `${lotesSelecionados.length} lote(s)`}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Lotes disponíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {lotes.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhum lote disponível
                </div>
              ) : (
                lotes.map((lote) => (
                  <DropdownMenuCheckboxItem
                    key={lote.id}
                    checked={lotesSelecionados.includes(lote.id)}
                    onCheckedChange={() => toggleLote(lote.id)}
                    className="text-xs"
                  >
                    {lote.nome}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Categorias */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Categorias</Label>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-full justify-between text-sm inline-flex items-center rounded-lg border border-input bg-background px-3 py-2 hover:bg-muted disabled:opacity-50" disabled={isLoading}>
              <span className="truncate text-xs">
                {categoriasSelecionadas.length === 0
                  ? 'Selecionar categorias'
                  : `${categoriasSelecionadas.length} categoria(s)`}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Categorias disponíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORIAS_DISPONIVEIS.map((categoria) => (
                <DropdownMenuCheckboxItem
                  key={categoria}
                  checked={categoriasSelecionadas.includes(categoria)}
                  onCheckedChange={() => toggleCategoria(categoria)}
                  className="text-xs"
                >
                  {categoria}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tags de filtros aplicados */}
      {(lotesSelecionados.length > 0 || categoriasSelecionadas.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {lotesSelecionados.map((loteId) => {
            const lote = lotes.find((l) => l.id === loteId);
            return (
              <div
                key={loteId}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
              >
                <span>{lote?.nome}</span>
                <button
                  onClick={() => toggleLote(loteId)}
                  className="ml-1 inline-flex hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {categoriasSelecionadas.map((categoria) => (
            <div
              key={categoria}
              className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700"
            >
              <span>{categoria}</span>
              <button
                onClick={() => toggleCategoria(categoria)}
                className="ml-1 inline-flex hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-2 border-t border-border pt-4">
        <Button
          onClick={handleAplicar}
          disabled={isLoading}
          className="flex-1 h-9 text-sm"
        >
          {isLoading ? 'Carregando...' : 'Aplicar Filtros'}
        </Button>
        <Button
          onClick={handleResetar}
          variant="outline"
          disabled={isLoading}
          className="flex-1 h-9 text-sm"
        >
          Resetar
        </Button>
      </div>
    </div>
  );
}
