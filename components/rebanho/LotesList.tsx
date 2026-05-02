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
import type { Lote } from '@/lib/types/rebanho';
import { deletarLote } from '@/lib/supabase/rebanho';

interface LotesListProps {
  lotes: Lote[];
  contagemAnimaisPorLote: Map<string, number>;
  perfil: string;
  onRefresh?: () => void;
}

export function LotesList({
  lotes,
  contagemAnimaisPorLote,
  perfil,
  onRefresh,
}: LotesListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = perfil === 'Administrador';

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deletarLote(deleteId);
      toast.success('Lote removido com sucesso');
      setDeleteId(null);
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover lote');
    } finally {
      setIsDeleting(false);
    }
  };

  if (lotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Nenhum lote cadastrado</p>
        <p className="text-sm text-muted-foreground/70">Crie seu primeiro lote para organizar os animais</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Nome do Lote</TableHead>
              <TableHead className="font-semibold">Animais Ativos</TableHead>
              <TableHead className="font-semibold">Total</TableHead>
              {isAdmin && <TableHead className="text-right font-semibold">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.map((lote) => {
              const count = contagemAnimaisPorLote.get(lote.id) || 0;
              return (
                <TableRow
                  key={lote.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <TableCell>
                    <Link
                      href={`/dashboard/rebanho/lotes/${lote.id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {lote.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50">
                      {count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{count}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(lote.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={count > 0}
                        title={count > 0 ? 'Não é possível deletar lote com animais' : ''}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover lote?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O lote será removido do sistema.
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
