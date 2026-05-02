'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listLotes, countAnimaisEmLote } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';

export default function LotesPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.perfil === 'Administrador';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const lotesData = await listLotes(100, 0);
      setLotes(lotesData);

      const contgs: Record<string, number> = {};
      for (const lote of lotesData) {
        contgs[lote.id] = await countAnimaisEmLote(lote.id);
      }
      setContagens(contgs);
    } catch (err) {
      toast.error('Erro ao carregar lotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rebanho', href: '/dashboard/rebanho' },
    { label: 'Lotes', href: '/dashboard/rebanho/lotes' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-3xl font-bold tracking-tight">Lotes</h1>
            {isAdmin && (
              <Button onClick={() => router.push('/dashboard/rebanho/lotes/novo')}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lote
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : lotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <p className="text-muted-foreground mb-4">Nenhum lote encontrado</p>
                {isAdmin && (
                  <Button onClick={() => router.push('/dashboard/rebanho/lotes/novo')}>
                    Criar primeiro lote
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Animais Ativos</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow
                        key={lote.id}
                        onClick={() => router.push(`/dashboard/rebanho/lotes/${lote.id}`)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{lote.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lote.descricao || '—'}
                        </TableCell>
                        <TableCell className="font-medium">{contagens[lote.id] || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/rebanho/lotes/${lote.id}`);
                            }}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Total de {lotes.length} lote(s) encontrado(s)
        </p>
      </div>
    </div>
  );
}
