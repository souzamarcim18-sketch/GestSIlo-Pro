'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AlertTriangle, Loader2, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listLotes,
  listAnimaisEmLote,
} from '@/lib/supabase/rebanho';
import { deletarLoteAction, transferirAnimaisAction } from '../../actions';
import type { Lote, Animal } from '@/lib/types/rebanho';

export default function LoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading, profile } = useAuth();

  const loteId = params.id as string;
  const [lote, setLote] = useState<Lote | null>(null);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAnimais, setSelectedAnimais] = useState<string[]>([]);
  const [loteDestino, setLoteDestino] = useState<string | null>(null);
  const [isTransferindo, setIsTransferindo] = useState(false);

  const isAdmin = profile?.perfil === 'Administrador';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lotesData, animaisData] = await Promise.all([
        listLotes(100, 0),
        listAnimaisEmLote(loteId),
      ]);

      const loteData = lotesData.find((l) => l.id === loteId);
      if (!loteData) {
        toast.error('Lote não encontrado');
        router.push('/dashboard/rebanho/lotes');
        return;
      }

      setLote(loteData);
      setAnimais(animaisData);
      setLotes(lotesData.filter((l) => l.id !== loteId));
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [loteId, router]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletarLoteAction(loteId);
      if (result.success) {
        toast.success('Lote deletado com sucesso');
        router.push('/dashboard/rebanho/lotes');
      } else {
        toast.error(result.error || 'Erro ao deletar lote');
      }
    } catch (err) {
      toast.error('Erro ao deletar lote');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleTransfer = async () => {
    if (!loteDestino) {
      toast.error('Selecione um lote destino');
      return;
    }

    setIsTransferindo(true);
    try {
      const result = await transferirAnimaisAction(selectedAnimais, loteDestino);
      if (result.success) {
        toast.success(`${result.transferidos} animal(is) transferido(s)`);
        setSelectedAnimais([]);
        setLoteDestino(null);
        fetchData();
      } else {
        toast.error(result.error || 'Erro ao transferir');
      }
    } catch (err) {
      toast.error('Erro ao transferir');
    } finally {
      setIsTransferindo(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rebanho', href: '/dashboard/rebanho' },
    { label: 'Lotes', href: '/dashboard/rebanho/lotes' },
    { label: lote?.nome || 'Lote', href: `/dashboard/rebanho/lotes/${loteId}` },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-card shadow-sm p-8 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Lote não encontrado</h2>
            <p className="text-sm text-muted-foreground">O lote que você procura não existe.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <div className="flex items-start justify-between mt-4 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{lote.nome}</h1>
              {lote.descricao && (
                <p className="text-muted-foreground mt-1">{lote.descricao}</p>
              )}
            </div>
            {isAdmin && (
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/rebanho/lotes/${loteId}/editar`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={animais.length > 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Animais ({animais.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {animais.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum animal neste lote</p>
            ) : (
              <>
                {isAdmin && selectedAnimais.length > 0 && (
                  <div className="mb-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {selectedAnimais.length} animal(is) selecionado(s)
                    </p>
                    <div className="flex gap-2">
                      <Select value={loteDestino} onValueChange={setLoteDestino}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Lote destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleTransfer}
                        disabled={isTransferindo || !loteDestino}
                      >
                        {isTransferindo ? 'Transferindo...' : 'Transferir'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && <TableHead className="w-12"></TableHead>}
                        <TableHead>Brinco</TableHead>
                        <TableHead>Sexo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Peso</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animais.map((animal) => (
                        <TableRow key={animal.id}>
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedAnimais.includes(animal.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedAnimais([...selectedAnimais, animal.id]);
                                  } else {
                                    setSelectedAnimais(
                                      selectedAnimais.filter((id) => id !== animal.id)
                                    );
                                  }
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{animal.brinco}</TableCell>
                          <TableCell>{animal.sexo}</TableCell>
                          <TableCell>{animal.categoria}</TableCell>
                          <TableCell>{animal.status}</TableCell>
                          <TableCell>
                            {animal.peso_atual ? `${animal.peso_atual.toFixed(1)} kg` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/rebanho/${animal.id}`)}
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deletar Lote</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar o lote <strong>{lote.nome}</strong>? Esta ação não
                pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deletando...' : 'Deletar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
