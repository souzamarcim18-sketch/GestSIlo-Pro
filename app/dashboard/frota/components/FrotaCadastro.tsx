'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Truck, Clock, Gauge, Fuel, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type UsoMaquina, type Profile } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { MaquinaDialog } from './dialogs/MaquinaDialog';
import { differenceInDays } from 'date-fns';

interface FrotaCadastroProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  profile?: Profile | null;
}

function calcularDepreciacao(maquina: Maquina) {
  if (!maquina.valor_aquisicao || !maquina.data_aquisicao) return null;
  const anosUso = differenceInDays(new Date(), new Date(maquina.data_aquisicao)) / 365;
  const depAnual = maquina.valor_aquisicao / (maquina.vida_util_anos ?? 10);
  const valorAtual = Math.max(0, maquina.valor_aquisicao - depAnual * anosUso);
  return {
    valorAtual,
    percentualRestante: (valorAtual / maquina.valor_aquisicao) * 100,
  };
}

const STATUS_BADGE: Record<string, string> = {
  'Ativo': 'default',
  'Em manutenção': 'secondary',
  'Parado': 'outline',
  'Vendido': 'destructive',
};

export function FrotaCadastro({ maquinas, usos, loading, onRefresh, profile }: FrotaCadastroProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (maquina: Maquina) => {
    if (!confirm(`Excluir "${maquina.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(maquina.id);
    try {
      await q.maquinas.remove(maquina.id);
      toast.success('Máquina excluída');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir máquina');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-16 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova Máquina
        </Button>
      </div>

      {/* Grid de cards */}
      <section aria-labelledby="cadastro-heading">
        <h2 id="cadastro-heading" className="sr-only">Máquinas cadastradas</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {maquinas.map((maquina) => {
            const dep = calcularDepreciacao(maquina);
            const horasTotais = usos
              .filter((u) => u.maquina_id === maquina.id)
              .reduce((acc, u) => acc + (u.horas || 0), 0);
            const kmTotais = usos
              .filter((u) => u.maquina_id === maquina.id)
              .reduce((acc, u) => acc + (u.km || 0), 0);

            return (
              <Card
                key={maquina.id}
                aria-label={`Máquina: ${maquina.nome}`}
                className="rounded-2xl bg-card shadow-sm"
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-bold truncate">{maquina.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Truck className="h-3 w-3" aria-hidden="true" />
                      {maquina.tipo}
                      {maquina.identificacao ? ` • ${maquina.identificacao}` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditMaquina(maquina)}
                      aria-label={`Editar ${maquina.nome}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {profile?.perfil === 'Administrador' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(maquina)}
                        disabled={deletingId === maquina.id}
                        aria-label={`Excluir ${maquina.nome}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Status + dados técnicos */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {[maquina.marca, maquina.modelo, maquina.ano].filter(Boolean).join(' ')}
                      </span>
                      {maquina.status && (
                        <Badge variant={(STATUS_BADGE[maquina.status] as any) ?? 'outline'}>
                          {maquina.status}
                        </Badge>
                      )}
                    </div>

                    {/* Depreciação */}
                    {dep && (
                      <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase">
                          <span>Valor Atual Estimado</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            -{(100 - dep.percentualRestante).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-base font-bold">
                          R$ {dep.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Aquisição: R$ {maquina.valor_aquisicao?.toLocaleString('pt-BR')} •{' '}
                          {maquina.vida_util_anos} anos
                        </div>
                      </div>
                    )}

                    {/* Métricas de uso */}
                    <div className="flex gap-4 pt-2 border-t">
                      <div
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"
                        aria-label={`${horasTotais} horas trabalhadas`}
                      >
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {horasTotais}h
                      </div>
                      <div
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        aria-label={`${kmTotais} km`}
                      >
                        <Gauge className="w-3 h-3" aria-hidden="true" />
                        {kmTotais}km
                      </div>
                      {maquina.consumo_medio_lh && (
                        <div
                          className="flex items-center gap-1 text-xs font-medium text-secondary"
                          aria-label={`${maquina.consumo_medio_lh} L/h`}
                        >
                          <Fuel className="w-3 h-3" aria-hidden="true" />
                          {maquina.consumo_medio_lh}L/h
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Estado vazio */}
          {maquinas.length === 0 && (
            <Card
              className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed rounded-2xl"
              role="status"
            >
              <Truck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" aria-hidden="true" />
              <CardTitle className="text-muted-foreground">Nenhuma máquina cadastrada</CardTitle>
              <CardDescription className="mt-1">
                Clique em &quot;Nova Máquina&quot; para começar a gerenciar sua frota.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      {/* Dialogs */}
      <MaquinaDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={async () => {
          setAddOpen(false);
          await onRefresh();
        }}
      />
      <MaquinaDialog
        open={!!editMaquina}
        onOpenChange={(open) => { if (!open) setEditMaquina(undefined); }}
        maquina={editMaquina}
        onSuccess={async () => {
          setEditMaquina(undefined);
          await onRefresh();
        }}
      />
    </>
  );
}
