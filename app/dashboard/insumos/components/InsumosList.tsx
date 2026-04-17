'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Insumo, CategoriaInsumo } from '@/types/insumos';

interface InsumosListProps {
  insumos: Insumo[];
  categorias?: CategoriaInsumo[];
  tipos?: Record<string, string>; // Map de tipo_id -> nome
  loading: boolean;
  onSaidaClick: (insumo: Insumo) => void;
  onAjusteClick: (insumo: Insumo) => void;
}

const ITEMS_PER_PAGE = 20;

export default function InsumosList({
  insumos,
  categorias = [],
  tipos = {},
  loading,
  onSaidaClick,
  onAjusteClick,
}: InsumosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtra insumos
  const filtered = useMemo(() => {
    return insumos.filter((insumo) => {
      const matchSearch = searchTerm === '' ||
        insumo.nome.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategoria = selectedCategoria === '' || insumo.categoria_id === selectedCategoria;

      const matchTipo = selectedTipo === '' || insumo.tipo_id === selectedTipo;

      return matchSearch && matchCategoria && matchTipo;
    });
  }, [insumos, searchTerm, selectedCategoria, selectedTipo]);

  // Pagina os resultados
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInsumos = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Reseta a página quando os filtros mudam
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    handleFilterChange();
  };

  const handleCategoriaChange = (value: string | null) => {
    setSelectedCategoria(value || '');
    setSelectedTipo(''); // Reset tipo quando muda categoria
    handleFilterChange();
  };

  const handleTipoChange = (value: string | null) => {
    setSelectedTipo(value || '');
    handleFilterChange();
  };

  const getCategoriaName = (categoriaId?: string) => {
    if (!categoriaId) return '—';
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || '—';
  };

  const getTipoName = (tipoId?: string) => {
    if (!tipoId) return '—';
    return tipos[tipoId] || '—';
  };

  // Filtra tipos disponíveis conforme categoria selecionada
  const tiposDisponiveis = selectedCategoria === ''
    ? Object.entries(tipos).map(([id, nome]) => ({ id, nome }))
    : Object.entries(tipos)
        .filter(([_, nome]) => {
          const tiposCategoria = insumos
            .filter(i => i.categoria_id === selectedCategoria && i.tipo_id === _)
            .map(i => i.tipo_id);
          return tiposCategoria.length > 0;
        })
        .map(([id, nome]) => ({ id, nome }));

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Produtos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos ({filtered.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs mb-1 block">Buscar por Nome</Label>
            <Input
              placeholder="Nome..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Categoria</Label>
            <Select value={selectedCategoria} onValueChange={handleCategoriaChange}>
              <SelectTrigger className="h-9">
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
          <div>
            <Label className="text-xs mb-1 block">Tipo</Label>
            <Select value={selectedTipo} onValueChange={handleTipoChange} disabled={!selectedCategoria && tiposDisponiveis.length === 0}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {tiposDisponiveis.map(({ id, nome }) => (
                  <SelectItem key={id} value={id}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        {paginatedInsumos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filtered.length === 0 ? 'Nenhum insumo encontrado.' : 'Nenhum item nesta página.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/5">Produto</TableHead>
                    <TableHead className="w-1/6">Categoria</TableHead>
                    <TableHead className="w-1/6">Tipo</TableHead>
                    <TableHead className="text-right w-1/6">Qtde</TableHead>
                    <TableHead className="text-right w-1/6">Mín</TableHead>
                    <TableHead className="w-1/6">Local</TableHead>
                    <TableHead className="w-1/6">Status</TableHead>
                    <TableHead className="w-1/5">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInsumos.map((insumo) => {
                    const critico = insumo.estoque_atual < insumo.estoque_minimo;
                    return (
                      <TableRow key={insumo.id}>
                        <TableCell className="font-medium text-sm">{insumo.nome}</TableCell>
                        <TableCell className="text-sm">
                          {getCategoriaName(insumo.categoria_id)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getTipoName(insumo.tipo_id)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {insumo.estoque_atual} {insumo.unidade}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {insumo.estoque_minimo} {insumo.unidade}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {insumo.local_armazen || '—'}
                        </TableCell>
                        <TableCell>
                          {critico ? (
                            <Badge variant="destructive" className="text-xs">Crítico</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSaidaClick(insumo)}
                              title="Registrar saída"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onAjusteClick(insumo)}
                              title="Ajustar estoque"
                            >
                              <ArrowDownRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink
                          onClick={() => setCurrentPage(i + 1)}
                          isActive={currentPage === i + 1}
                          className={currentPage === i + 1 ? '' : 'cursor-pointer'}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
