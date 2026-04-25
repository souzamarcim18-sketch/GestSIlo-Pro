'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Fuel, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type Abastecimento } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { AbastecimentoDialog } from './dialogs/AbastecimentoDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FrotaAbastecimentoProps {
  maquinas: Maquina[];
  abastecimentos: Abastecimento[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function FrotaAbastecimento({
  maquinas,
  abastecimentos,
  loading,
  onRefresh,
}: FrotaAbastecimentoProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (abs: Abastecimento) => {
    if (!confirm('Excluir este abastecimento?')) return;
    setDeletingId(abs.id);
    try {
      await q.abastecimentos.remove(abs.id);
      toast.success('Abastecimento removido');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setDeletingId(null);
    }
  };

  // Totalizadores
  const totalLitros = abastecimentos.reduce((acc, a) => acc + (a.litros || 0), 0);
  const totalValor = abastecimentos.reduce((acc, a) => acc + (a.valor || 0), 0);

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Sumário */}
      {abastecimentos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="rounded-xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Litros</p>
              <p className="text-2xl font-bold mt-1">
                {totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Gasto</p>
              <p className="text-2xl font-bold mt-1">
                R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle id="abast-titulo">Histórico de Abastecimentos</CardTitle>
            <CardDescription>Consumo de combustível por máquina.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Fuel className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo Abastecimento
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table aria-labelledby="abast-titulo">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Data</TableHead>
                  <TableHead scope="col">Máquina</TableHead>
                  <TableHead scope="col">Combustível</TableHead>
                  <TableHead scope="col">Litros</TableHead>
                  <TableHead scope="col">Valor Total</TableHead>
                  <TableHead scope="col">R$/L</TableHead>
                  <TableHead scope="col">Hodômetro</TableHead>
                  <TableHead scope="col" className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {abastecimentos.map((abs) => (
                  <TableRow key={abs.id}>
                    <TableCell>
                      {format(new Date(abs.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {maquinas.find((m) => m.id === abs.maquina_id)?.nome ?? 'Máquina removida'}
                    </TableCell>
                    <TableCell>{abs.combustivel}</TableCell>
                    <TableCell className="font-bold">{abs.litros} L</TableCell>
                    <TableCell>R$ {abs.valor?.toFixed(2) ?? '—'}</TableCell>
                    <TableCell>
                      {abs.valor && abs.litros
                        ? `R$ ${(abs.valor / abs.litros).toFixed(3)}`
                        : '—'}
                    </TableCell>
                    <TableCell>{abs.hodometro ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(abs)}
                        disabled={deletingId === abs.id}
                        aria-label="Remover abastecimento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {abastecimentos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      Nenhum abastecimento registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AbastecimentoDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        maquinas={maquinas}
        onSuccess={async () => {
          setAddOpen(false);
          await onRefresh();
        }}
      />
    </>
  );
}
