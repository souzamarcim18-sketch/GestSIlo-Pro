'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { ArrowDownRight, ArrowUpRight, SlidersHorizontal, Trash2, Pencil } from 'lucide-react';
import type { Database } from '@/types/supabase';
import type { ProdutosFiltersState } from './ProdutosFilters';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];
type CategoriaProdutoRow = Database['public']['Tables']['categorias_produto']['Row'];

interface ProdutosListProps {
  produtos: ProdutoRow[];
  categorias: CategoriaProdutoRow[];
  filters: ProdutosFiltersState;
  loading: boolean;
  isAdmin: boolean;
  onEntradaClick: (produto: ProdutoRow) => void;
  onSaidaClick: (produto: ProdutoRow) => void;
  onAjusteClick: (produto: ProdutoRow) => void;
  onEditClick: (produto: ProdutoRow) => void;
  onDeleteClick: (produto: ProdutoRow) => void;
}

const ITEMS_PER_PAGE = 20;

export default function ProdutosList({
  produtos,
  categorias,
  filters,
  loading,
  isAdmin,
  onEntradaClick,
  onSaidaClick,
  onAjusteClick,
  onEditClick,
  onDeleteClick,
}: ProdutosListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca = !filters.busca || p.nome.toLowerCase().includes(filters.busca.toLowerCase());
      const matchCategoria = !filters.categoria_id || p.categoria_id === filters.categoria_id;
      const critico = p.estoque_atual < p.estoque_minimo;
      const matchStatus =
        !filters.status ||
        (filters.status === 'critico' && critico) ||
        (filters.status === 'ok' && !critico);
      return matchBusca && matchCategoria && matchStatus;
    });
  }, [produtos, filters]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const getCatNome = (categoria_id: string) =>
    categorias.find((c) => c.id === categoria_id)?.nome ?? '—';

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
        {paginated.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum produto encontrado.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((produto) => {
                    const critico = produto.estoque_atual < produto.estoque_minimo;
                    return (
                      <TableRow key={produto.id}>
                        <TableCell className="font-medium text-sm">{produto.nome}</TableCell>
                        <TableCell className="text-sm">{getCatNome(produto.categoria_id)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {produto.estoque_atual} {produto.unidade}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {produto.estoque_minimo} {produto.unidade}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {produto.local_armazen ?? '—'}
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
                            {isAdmin && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => onEntradaClick(produto)}
                                title="Registrar entrada"
                              >
                                <ArrowDownRight className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => onSaidaClick(produto)}
                                title="Registrar saída"
                              >
                                <ArrowUpRight className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => onAjusteClick(produto)}
                                title="Ajustar estoque"
                              >
                                <SlidersHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => onEditClick(produto)}
                                title="Editar produto"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => onDeleteClick(produto)}
                                title="Deletar produto"
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

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
