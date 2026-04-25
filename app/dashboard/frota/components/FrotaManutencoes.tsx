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
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Clock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type Manutencao, type PlanoManutencao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { verificarAlertaPlanoManutencao } from '@/lib/utils/frota';
import { ManutencaoDialog } from './dialogs/ManutencaoDialog';
import { PlanoManutencaoDialog } from './dialogs/PlanoManutencaoDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FrotaManutencoesProps {
  maquinas: Maquina[];
  manutencoes: Manutencao[];
  planosManutencao: PlanoManutencao[];
  loading: boolean;
  onRefreshManutencoes: () => Promise<void>;
  onRefreshPlanos: () => Promise<void>;
  onRefreshMaquinas: () => void;
  onMaquinaStatusChange?: (maquinaId: string, novoStatus: Maquina['status']) => void;
}

// ---------------------------------------------------------------------------
// Progresso de plano
// ---------------------------------------------------------------------------
function ProgressoPlano({
  plano,
  horimetroAtual,
}: {
  plano: PlanoManutencao;
  horimetroAtual: number;
}) {
  const alerta = verificarAlertaPlanoManutencao(plano, horimetroAtual);

  if (!plano.intervalo_horas || !plano.horimetro_base) {
    return <span className="text-xs text-muted-foreground">Sem dados de horímetro</span>;
  }

  const proxima = plano.horimetro_base + plano.intervalo_horas;
  const percorrido = Math.max(0, horimetroAtual - plano.horimetro_base);
  const progresso = Math.min(100, (percorrido / plano.intervalo_horas) * 100);

  return (
    <div className="space-y-1 min-w-[160px]">
      <Progress
        value={progresso}
        className={`h-2 ${alerta.urgente ? 'bg-destructive/20' : alerta.emAlerta ? 'bg-yellow-100' : ''}`}
      />
      <p className="text-xs text-muted-foreground">
        {alerta.horasRestantes !== null ? (
          alerta.horasRestantes <= 0
            ? <span className="text-destructive font-medium">Vencido em {Math.abs(alerta.horasRestantes).toFixed(0)} h</span>
            : <span>{alerta.horasRestantes.toFixed(0)} h restantes (próx.: {proxima.toFixed(0)} h)</span>
        ) : '—'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function FrotaManutencoes({
  maquinas,
  manutencoes,
  planosManutencao,
  loading,
  onRefreshManutencoes,
  onRefreshPlanos,
  onRefreshMaquinas,
  onMaquinaStatusChange,
}: FrotaManutencoesProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editManutencao, setEditManutencao] = useState<Manutencao | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [planoOpen, setPlanoOpen] = useState(false);
  const [editPlano, setEditPlano] = useState<PlanoManutencao | undefined>(undefined);
  const [deletingPlanoId, setDeletingPlanoId] = useState<string | null>(null);

  const handleDeleteManutencao = async (man: Manutencao) => {
    if (!confirm('Excluir esta manutenção?')) return;
    setDeletingId(man.id);
    try {
      await q.manutencoes.remove(man.id);
      toast.success('Manutenção removida');
      await onRefreshManutencoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePlano = async (plano: PlanoManutencao) => {
    if (!confirm('Excluir este plano de manutenção?')) return;
    setDeletingPlanoId(plano.id);
    try {
      await q.planosManutencao.remove(plano.id);
      toast.success('Plano removido');
      await onRefreshPlanos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover plano');
    } finally {
      setDeletingPlanoId(null);
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
          <TabsTrigger value="planos">Planos de Manutenção</TabsTrigger>
        </TabsList>

        {/* ── Sub-aba: Registros ─────────────────────────────────────────── */}
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
                            onClick={(e) => { e.stopPropagation(); handleDeleteManutencao(man); }}
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

        {/* ── Sub-aba: Planos ────────────────────────────────────────────── */}
        <TabsContent value="planos">
          <Card className="rounded-2xl bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="plano-titulo">Planos de Manutenção Preventiva</CardTitle>
                <CardDescription>
                  Alertas automáticos por horímetro e calendário.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditPlano(undefined); setPlanoOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              {planosManutencao.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
                  <p className="text-lg font-semibold text-muted-foreground">Nenhum plano cadastrado</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Crie planos de manutenção preventiva para receber alertas automáticos quando o
                    horímetro se aproximar do intervalo programado.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => { setEditPlano(undefined); setPlanoOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeiro plano
                  </Button>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table aria-labelledby="plano-titulo">
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Máquina</TableHead>
                        <TableHead scope="col">Serviço</TableHead>
                        <TableHead scope="col">Intervalo</TableHead>
                        <TableHead scope="col">Progresso</TableHead>
                        <TableHead scope="col">Status</TableHead>
                        <TableHead scope="col" className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planosManutencao.map((plano) => {
                        const maquina = maquinas.find((m) => m.id === plano.maquina_id);
                        const horimetroAtual = maquina?.horimetro_atual ?? 0;
                        const alerta = verificarAlertaPlanoManutencao(plano, horimetroAtual);
                        return (
                          <TableRow key={plano.id}>
                            <TableCell className="font-medium">
                              {maquina?.nome ?? '—'}
                            </TableCell>
                            <TableCell>{plano.descricao}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {plano.intervalo_horas ? `${plano.intervalo_horas} h` : ''}
                              {plano.intervalo_horas && plano.intervalo_dias ? ' / ' : ''}
                              {plano.intervalo_dias ? `${plano.intervalo_dias} dias` : ''}
                            </TableCell>
                            <TableCell>
                              <ProgressoPlano plano={plano} horimetroAtual={horimetroAtual} />
                            </TableCell>
                            <TableCell>
                              {!plano.ativo ? (
                                <Badge variant="outline">Inativo</Badge>
                              ) : alerta.urgente ? (
                                <Badge variant="destructive">Vencido</Badge>
                              ) : alerta.emAlerta ? (
                                <Badge variant="secondary">Alerta</Badge>
                              ) : (
                                <Badge variant="default">Em dia</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => { setEditPlano(plano); setPlanoOpen(true); }}
                                  aria-label="Editar plano"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeletePlano(plano)}
                                  disabled={deletingPlanoId === plano.id}
                                  aria-label="Remover plano"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs — Manutenção */}
      <ManutencaoDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        maquinas={maquinas}
        onSuccess={async () => {
          setAddOpen(false);
          await onRefreshManutencoes();
        }}
        onMaquinaStatusChange={(id, status) => {
          onMaquinaStatusChange?.(id, status);
          onRefreshMaquinas();
        }}
      />
      <ManutencaoDialog
        open={!!editManutencao}
        onOpenChange={(open) => { if (!open) setEditManutencao(undefined); }}
        maquinas={maquinas}
        manutencao={editManutencao}
        onSuccess={async () => {
          setEditManutencao(undefined);
          await onRefreshManutencoes();
        }}
        onMaquinaStatusChange={(id, status) => {
          onMaquinaStatusChange?.(id, status);
          onRefreshMaquinas();
        }}
      />

      {/* Dialogs — Plano */}
      <PlanoManutencaoDialog
        open={planoOpen}
        onOpenChange={setPlanoOpen}
        maquinas={maquinas}
        plano={editPlano}
        onSuccess={async () => {
          setPlanoOpen(false);
          setEditPlano(undefined);
          await onRefreshPlanos();
        }}
      />
    </>
  );
}
