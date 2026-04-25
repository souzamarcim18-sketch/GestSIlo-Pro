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
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type UsoMaquina, type Talhao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { UsoDialog } from './dialogs/UsoDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FrotaDiarioBordoProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  talhoes: Talhao[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function FrotaDiarioBordo({
  maquinas,
  usos,
  talhoes,
  loading,
  onRefresh,
}: FrotaDiarioBordoProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (uso: UsoMaquina) => {
    if (!confirm('Excluir este registro de uso?')) return;
    setDeletingId(uso.id);
    try {
      await q.usoMaquinas.remove(uso.id);
      toast.success('Registro removido');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle id="uso-titulo">Diário de Bordo</CardTitle>
            <CardDescription>Registros de atividades e horas trabalhadas.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Registrar Uso
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table aria-labelledby="uso-titulo">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Data</TableHead>
                  <TableHead scope="col">Máquina</TableHead>
                  <TableHead scope="col">Operador</TableHead>
                  <TableHead scope="col">Atividade</TableHead>
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Horas</TableHead>
                  <TableHead scope="col">KM</TableHead>
                  <TableHead scope="col">Área (ha)</TableHead>
                  <TableHead scope="col" className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usos.map((uso) => (
                  <TableRow key={uso.id}>
                    <TableCell>
                      {format(new Date(uso.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {maquinas.find((m) => m.id === uso.maquina_id)?.nome ?? 'Máquina removida'}
                    </TableCell>
                    <TableCell>{uso.operador ?? '—'}</TableCell>
                    <TableCell>{uso.atividade ?? '—'}</TableCell>
                    <TableCell>{uso.tipo_operacao ?? '—'}</TableCell>
                    <TableCell>{uso.horas != null ? `${uso.horas}h` : '—'}</TableCell>
                    <TableCell>{uso.km != null ? `${uso.km}km` : '—'}</TableCell>
                    <TableCell>{uso.area_ha != null ? `${uso.area_ha}ha` : '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(uso)}
                        disabled={deletingId === uso.id}
                        aria-label="Remover registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {usos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-10 text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      Nenhum registro de uso encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UsoDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        maquinas={maquinas}
        talhoes={talhoes}
        onSuccess={async () => {
          setAddOpen(false);
          await onRefresh();
        }}
      />
    </>
  );
}
