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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type Manutencao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { ManutencaoDialog } from './dialogs/ManutencaoDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FrotaManutencoesProps {
  maquinas: Maquina[];
  manutencoes: Manutencao[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onMaquinaStatusChange?: (maquinaId: string, novoStatus: Maquina['status']) => void;
}

export function FrotaManutencoes({
  maquinas,
  manutencoes,
  loading,
  onRefresh,
  onMaquinaStatusChange,
}: FrotaManutencoesProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editManutencao, setEditManutencao] = useState<Manutencao | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (man: Manutencao) => {
    if (!confirm('Excluir esta manutenção?')) return;
    setDeletingId(man.id);
    try {
      await q.manutencoes.remove(man.id);
      toast.success('Manutenção removida');
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
      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="registros">Registros</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
        </TabsList>

        {/* ── Sub-aba: Registros ─────────────────────────────────────── */}
        <TabsContent value="registros">
          <Card className="rounded-2xl bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="man-titulo">Histórico de Manutenções</CardTitle>
                <CardDescription>Serviços realizados e próximos agendamentos.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nova Manutenção
              </Button>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table aria-labelledby="man-titulo">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Data</TableHead>
                      <TableHead scope="col">Máquina</TableHead>
                      <TableHead scope="col">Tipo</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Descrição</TableHead>
                      <TableHead scope="col">Custo</TableHead>
                      <TableHead scope="col">Próxima</TableHead>
                      <TableHead scope="col" className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manutencoes.map((man) => (
                      <TableRow
                        key={man.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setEditManutencao(man)}
                      >
                        <TableCell>
                          {format(new Date(man.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {maquinas.find((m) => m.id === man.maquina_id)?.nome ?? 'Removida'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={man.tipo === 'Preventiva' ? 'outline' : 'secondary'}>
                            {man.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {man.status && (
                            <Badge
                              variant={
                                man.status === 'concluída'
                                  ? 'default'
                                  : man.status === 'em andamento'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {man.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {man.descricao}
                        </TableCell>
                        <TableCell className="font-bold">
                          {man.custo != null ? `R$ ${man.custo.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {man.proxima_manutencao
                            ? format(new Date(man.proxima_manutencao), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(man); }}
                            disabled={deletingId === man.id}
                            aria-label="Remover manutenção"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {manutencoes.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-10 text-muted-foreground"
                          role="status"
                          aria-live="polite"
                        >
                          Nenhuma manutenção registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sub-aba: Planos (placeholder) ─────────────────────────── */}
        <TabsContent value="planos">
          <Card className="rounded-2xl bg-card shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Clock className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
              <p className="text-lg font-semibold text-muted-foreground">Em breve</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Planos de manutenção preventiva com alertas automáticos por horímetro e calendário.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ManutencaoDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        maquinas={maquinas}
        onSuccess={async () => {
          setAddOpen(false);
          await onRefresh();
        }}
        onMaquinaStatusChange={onMaquinaStatusChange}
      />
      <ManutencaoDialog
        open={!!editManutencao}
        onOpenChange={(open) => { if (!open) setEditManutencao(undefined); }}
        maquinas={maquinas}
        manutencao={editManutencao}
        onSuccess={async () => {
          setEditManutencao(undefined);
          await onRefresh();
        }}
        onMaquinaStatusChange={onMaquinaStatusChange}
      />
    </>
  );
}
