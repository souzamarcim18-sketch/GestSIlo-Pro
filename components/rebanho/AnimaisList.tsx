'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Animal } from '@/lib/types/rebanho';
import { deletarAnimal } from '@/lib/supabase/rebanho';
import { cn } from '@/lib/utils';

interface AnimaisListProps {
  animais: Animal[];
  perfil: string;
  onRefresh?: () => void;
}

const statusVariant = {
  Ativo: 'bg-green-100 text-green-800',
  Morto: 'bg-red-100 text-red-800',
  Vendido: 'bg-orange-100 text-orange-800',
} as const;

export function AnimaisList({ animais, perfil, onRefresh }: AnimaisListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = perfil === 'Administrador';

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deletarAnimal(deleteId);
      toast.success('Animal removido com sucesso');
      setDeleteId(null);
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover animal');
    } finally {
      setIsDeleting(false);
    }
  };

  if (animais.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Nenhum animal cadastrado</p>
        <p className="text-sm text-muted-foreground/70">Comece criando seu primeiro animal</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Brinco</TableHead>
              <TableHead className="font-semibold">Sexo</TableHead>
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold">Peso Atual</TableHead>
              <TableHead className="font-semibold">Lote</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {isAdmin && <TableHead className="text-right font-semibold">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {animais.map((animal) => (
              <TableRow
                key={animal.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <TableCell>
                  <Link
                    href={`/dashboard/rebanho/${animal.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {animal.brinco}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{animal.sexo === 'Macho' ? '♂' : '♀'} {animal.sexo}</span>
                </TableCell>
                <TableCell className="text-sm">{animal.categoria}</TableCell>
                <TableCell className="text-sm">
                  {animal.peso_atual ? `${animal.peso_atual.toFixed(1)} kg` : '—'}
                </TableCell>
                <TableCell className="text-sm">{animal.lote_id ? 'Associado' : '—'}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs font-medium', statusVariant[animal.status])}>
                    {animal.status}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(animal.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover animal?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O animal será marcado como removido e não aparecerá
              mais nas listagens.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteId(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
