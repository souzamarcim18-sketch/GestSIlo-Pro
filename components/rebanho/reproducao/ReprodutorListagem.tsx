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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';

interface ReprodutorListemProps {
  reprodutores: Reprodutor[];
  isAdmin: boolean;
  onEdit: (reprodutor: Reprodutor) => void;
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 50;
const tiposMap = {
  touro: 'Touro',
  semen_ia: 'Sêmen IA',
  touro_teste: 'Touro Teste',
};

export function ReprodutorListagem({
  reprodutores,
  isAdmin,
  onEdit,
  onDelete,
}: ReprodutorListemProps) {
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredReproductores = useMemo(() => {
    return reprodutores.filter((r) => {
      const matchSearch =
        r.nome.toLowerCase().includes(search.toLowerCase()) ||
        r.numero_registro?.toLowerCase().includes(search.toLowerCase());
      const matchTipo = !filtroTipo || r.tipo === filtroTipo;
      return matchSearch && matchTipo;
    });
  }, [reprodutores, search, filtroTipo]);

  const totalPages = Math.ceil(filteredReproductores.length / ITEMS_PER_PAGE);
  const paginatedReproductores = filteredReproductores.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este reprodutor?')) return;

    setIsDeleting(id);
    try {
      // TODO: Implementar deleteReprodutorAction
      toast.success('Reprodutor deletado com sucesso');
      onDelete(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar reprodutor');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="search" className="text-sm font-medium">
            Buscar
          </label>
          <Input
            id="search"
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
        <div className="w-full sm:w-48">
          <label htmlFor="filtro_tipo" className="text-sm font-medium">
            Tipo
          </label>
          <Select value={filtroTipo ?? ''} onValueChange={(v) => {
            setFiltroTipo(v || '');
            setCurrentPage(0);
          }}>
            <SelectTrigger id="filtro_tipo" className="mt-1 h-10">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(tiposMap).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Raça</TableHead>
              <TableHead className="hidden lg:table-cell">Registro</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReproductores.length > 0 ? (
              paginatedReproductores.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {tiposMap[r.tipo as keyof typeof tiposMap]}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.raca || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {r.numero_registro || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(r)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(r.id)}
                            disabled={isDeleting === r.id}
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
                  Nenhum reprodutor encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Mostrando {paginatedReproductores.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0} a{' '}
            {Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredReproductores.length)} de{' '}
            {filteredReproductores.length} reprodutores
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
