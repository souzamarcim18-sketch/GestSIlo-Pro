'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import type { Insumo, CategoriaInsumo } from '@/types/insumos';

interface InsumosListProps {
  insumos: Array<Insumo & { categoria?: { id: string; nome: string }; tipo?: { id: string; nome: string } }>;
  categorias?: CategoriaInsumo[];
  filters: {
    busca: string;
    categoria_id: string;
    tipo_id: string;
  };
  loading: boolean;
  onSaidaClick: (insumo: Insumo) => void;
  onAjusteClick: (insumo: Insumo) => void;
  onDeleteClick?: (insumo: Insumo) => void;
}

const ITEMS_PER_PAGE = 20;

export default function InsumosList({
  insumos,
  categorias = [],
  filters,
  loading,
  onSaidaClick,
  onAjusteClick,
  onDeleteClick,
}: InsumosListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Filtra insumos baseado nas props de filtros
  const filtered = useMemo(() => {
    return insumos.filter((insumo) => {
      const matchSearch = filters.busca === '' ||
        insumo.nome.toLowerCase().includes(filters.busca.toLowerCase());

      const matchCategoria = filters.categoria_id === '' || insumo.categoria_id === filters.categoria_id;

      const matchTipo = filters.tipo_id === '' || insumo.tipo_id === filters.tipo_id;

      return matchSearch && matchCategoria && matchTipo;
    });
  }, [insumos, filters]);

  // Pagina os resultados
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInsumos = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const getCategoriaName = (categoria?: { id: string; nome: string }) => {
    return categoria?.nome || '—';
  };

  const getTipoName = (tipo?: { id: string; nome: string }) => {
    return tipo?.nome || '—';
  };

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
                          {getCategoriaName(insumo.categoria)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getTipoName(insumo.tipo)}
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
                            {onDeleteClick && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteClick(insumo)}
                                title="Deletar insumo"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
