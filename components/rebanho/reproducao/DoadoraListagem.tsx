'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { deletarDoadoraAction } from '@/app/dashboard/rebanho/doadoras/actions';
import type { Doadora } from '@/lib/types/rebanho-doadoras';

interface DoadoraListagemProps {
  doadoras: Doadora[];
  isAdmin: boolean;
  onEdit: (doadora: Doadora) => void;
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 50;

export function DoadoraListagem({ doadoras, isAdmin, onEdit, onDelete }: DoadoraListagemProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return doadoras.filter(
      (d) =>
        d.nome.toLowerCase().includes(search.toLowerCase()) ||
        d.numero_registro?.toLowerCase().includes(search.toLowerCase())
    );
  }, [doadoras, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta doadora?')) return;

    setIsDeleting(id);
    try {
      const result = await deletarDoadoraAction(id);
      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }
      toast.success('Doadora deletada com sucesso');
      onDelete(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar doadora');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="search_doadora" className="text-sm font-medium">
            Buscar
          </label>
          <Input
            id="search_doadora"
            type="text"
            placeholder="Nome ou número de registro..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(0);
            }}
            className="mt-1 h-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Origem</TableHead>
              <TableHead className="hidden md:table-cell">Raça</TableHead>
              <TableHead className="hidden lg:table-cell">Registro</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    <Badge variant={d.origem === 'interna' ? 'secondary' : 'outline'}>
                      {d.origem === 'interna' ? 'Interna' : 'Externa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{d.raca || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {d.numero_registro || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(d)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(d.id)}
                            disabled={isDeleting === d.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-12 text-center text-muted-foreground">
                  Nenhuma doadora cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Mostrando {paginated.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0} a{' '}
            {Math.min((currentPage + 1) * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}{' '}
            doadoras
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="h-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="h-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
