'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Truck,
  Clock,
  Gauge,
  Fuel,
  Wrench,
  BookOpen,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type UsoMaquina, type Profile } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { differenceInDays } from 'date-fns';

interface MaquinasListProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  loading: boolean;
  profile?: Profile | null;
  onNova: () => void;
  onEditar: (maquina: Maquina) => void;
  onRegistrarUso: (maquina: Maquina) => void;
  onRegistrarManutencao: (maquina: Maquina) => void;
  onRegistrarAbastecimento: (maquina: Maquina) => void;
  onRefresh: () => Promise<void>;
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Ativo': 'default',
  'Em manutenção': 'secondary',
  'Parado': 'outline',
  'Vendido': 'destructive',
};

function calcularValorAtual(maquina: Maquina): number | null {
  if (!maquina.valor_aquisicao || !maquina.data_aquisicao) return null;
  const anosUso = differenceInDays(new Date(), new Date(maquina.data_aquisicao)) / 365;
  const depAnual = maquina.valor_aquisicao / (maquina.vida_util_anos ?? 10);
  return Math.max(0, maquina.valor_aquisicao - depAnual * anosUso);
}

function fmtBrl(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MaquinasList({
  maquinas,
  usos,
  loading,
  profile,
  onNova,
  onEditar,
  onRegistrarUso,
  onRegistrarManutencao,
  onRegistrarAbastecimento,
  onRefresh,
}: MaquinasListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = profile?.perfil === 'Administrador';

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

  return (
    <Card className="rounded-2xl bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle id="maquinas-titulo">Máquinas e Equipamentos</CardTitle>
          <CardDescription>
            Clique em uma máquina para ver o histórico de eventos.
          </CardDescription>
        </div>
        <Button size="sm" onClick={onNova}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova Máquina
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : maquinas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center" role="status">
            <Truck className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
            <p className="text-lg font-semibold text-muted-foreground">Nenhuma máquina cadastrada</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Clique em &quot;Nova Máquina&quot; para começar a gerenciar sua frota.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table aria-labelledby="maquinas-titulo">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="text-sm font-semibold">Máquina</TableHead>
                  <TableHead scope="col" className="text-sm font-semibold">Tipo</TableHead>
                  <TableHead scope="col" className="text-sm font-semibold">Status</TableHead>
                  <TableHead scope="col" className="text-right text-sm font-semibold">Horas</TableHead>
                  <TableHead scope="col" className="text-right text-sm font-semibold">KM</TableHead>
                  <TableHead scope="col" className="text-right text-sm font-semibold">Valor estimado</TableHead>
                  <TableHead scope="col" className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {maquinas.map((maquina) => {
                  const horasTotais = usos
                    .filter((u) => u.maquina_id === maquina.id)
                    .reduce((acc, u) => acc + (u.horas || 0), 0);
                  const kmTotais = usos
                    .filter((u) => u.maquina_id === maquina.id)
                    .reduce((acc, u) => acc + (u.km || 0), 0);
                  const valorAtual = calcularValorAtual(maquina);

                  return (
                    <TableRow
                      key={maquina.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => router.push(`/dashboard/frota/${maquina.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{maquina.nome}</span>
                          <span className="text-sm text-muted-foreground">
                            {[maquina.marca, maquina.modelo, maquina.ano].filter(Boolean).join(' ') || '—'}
                            {maquina.identificacao ? ` • ${maquina.identificacao}` : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Truck className="h-3 w-3" aria-hidden="true" />
                          {maquina.tipo}
                        </span>
                      </TableCell>
                      <TableCell>
                        {maquina.status && (
                          <Badge variant={STATUS_BADGE[maquina.status] ?? 'outline'}>
                            {maquina.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          {horasTotais}h
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Gauge className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          {kmTotais}km
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {valorAtual != null ? fmtBrl(valorAtual) : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                            aria-label={`Ações para ${maquina.nome}`}
                            disabled={deletingId === maquina.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/frota/${maquina.id}`)}>
                              <ChevronRight className="mr-2 h-4 w-4" aria-hidden="true" />
                              Ver histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditar(maquina)}>
                              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                Registrar evento
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => onRegistrarUso(maquina)}>
                                  <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Uso / Horas
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRegistrarManutencao(maquina)}>
                                  <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Manutenção
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRegistrarAbastecimento(maquina)}>
                                  <Fuel className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Abastecimento
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(maquina)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
  );
}
