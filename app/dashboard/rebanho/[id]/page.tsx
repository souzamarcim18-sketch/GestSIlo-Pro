'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AlertTriangle, Loader2, Edit, Trash2, Plus } from 'lucide-react';
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
import {
  listEventosPorAnimal,
  listPesosPorAnimal,
  listAnimais,
  listLotes,
} from '@/lib/supabase/rebanho';
import { getHistoricoAnimalAction } from '@/lib/supabase/rebanho-movimentacoes-actions';
import type { MovimentacaoListItem } from '@/lib/supabase/rebanho-movimentacoes';
import { AbaProducaoLeiteira } from '@/components/rebanho/AbaProducaoLeiteira';
import { AbaSanidade } from '@/components/rebanho/AbaSanidade';
import { deletarAnimalAction } from '../actions';
import { Badge } from '@/components/ui/badge';
import {
  calcularGMDUltimasDuas,
  calcularProjecaoAbate,
  calcularArrobasEstimadas,
} from '@/lib/calculos/indicadores-rebanho';
import { formatDate } from '@/lib/utils';
import type { Animal, EventoRebanho, PesoAnimal, Lote } from '@/lib/types/rebanho';

function getBadgeColorMovimentacao(tipo: string): string {
  switch (tipo) {
    case 'nascimento':
      return 'bg-green-100 text-green-800';
    case 'venda':
      return 'bg-emerald-100 text-emerald-800';
    case 'morte':
      return 'bg-red-100 text-red-800';
    case 'descarte':
      return 'bg-orange-100 text-orange-800';
    case 'transferencia_lote':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getTipoLabelMovimentacao(tipo: string): string {
  const labels: Record<string, string> = {
    nascimento: 'Nascimento',
    venda: 'Venda',
    morte: 'Morte',
    descarte: 'Descarte',
    transferencia_lote: 'Transferência',
  };
  return labels[tipo] || tipo;
}

function getDetalhesMovimentacao(mov: MovimentacaoListItem): string {
  switch (mov.tipo) {
    case 'venda':
      return `Comprador: ${mov.comprador}`;
    case 'morte':
      return `Causa: ${mov.observacoes || ''}`;
    case 'transferencia_lote':
      return `Lote: ${mov.lote_nome}`;
    case 'descarte':
      return `Motivo: ${mov.motivo_descarte}`;
    default:
      return mov.observacoes || '—';
  }
}

function DesempenhoCorteContent({ animal, pesos }: { animal: Animal; pesos: PesoAnimal[] }) {
  const gmdUltimas = calcularGMDUltimasDuas(pesos);
  const pesoAlvo = 480;
  const diasAbate = calcularProjecaoAbate(animal.peso_atual, gmdUltimas, pesoAlvo);
  const arrobas = calcularArrobasEstimadas(animal.peso_atual, 0.52);
  const currentTimeRef = useRef<number>(0);
  const [dataAbateEstimada, setDataAbateEstimada] = useState<string | null>(null);

  useEffect(() => {
    if (currentTimeRef.current === 0) {
      currentTimeRef.current = Date.now();
      if (diasAbate) {
        setDataAbateEstimada(
          new Date(currentTimeRef.current + diasAbate * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
        );
      } else {
        setDataAbateEstimada(null);
      }
    } else if (diasAbate) {
      setDataAbateEstimada(
        new Date(currentTimeRef.current + diasAbate * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      );
    } else {
      setDataAbateEstimada(null);
    }
  }, [diasAbate]);

  const getGmdColor = (gmd: number | null) => {
    if (gmd === null) return 'bg-muted text-muted-foreground';
    if (gmd > 1) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    if (gmd >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">GMD (Últimas 2 Pesagens)</p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">
              {gmdUltimas ? `${gmdUltimas.toFixed(2)} kg/dia` : '—'}
            </div>
            {gmdUltimas !== null && (
              <Badge className={getGmdColor(gmdUltimas)}>
                {gmdUltimas > 1
                  ? 'Ótimo'
                  : gmdUltimas >= 0.5
                  ? 'Normal'
                  : 'Baixo'}
              </Badge>
            )}
          </div>
          {pesos.length < 2 && (
            <p className="text-xs text-muted-foreground mt-2">
              Registre 2 pesagens para calcular
            </p>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Condição Corporal</p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">
              {pesos.length > 0 && pesos[0].condicao_corporal
                ? `${pesos[0].condicao_corporal}/5`
                : '—'}
            </div>
            {pesos.length > 0 && pesos[0].condicao_corporal && (
              <div className="text-sm text-muted-foreground">
                {pesos[0].condicao_corporal === 1
                  ? 'Muito magra'
                  : pesos[0].condicao_corporal === 2
                  ? 'Magra'
                  : pesos[0].condicao_corporal === 3
                  ? 'Normal'
                  : pesos[0].condicao_corporal === 4
                  ? 'Gorda'
                  : 'Muito gorda'}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Arrobas Estimadas</p>
          <div className="text-2xl font-bold">
            {arrobas ? `${arrobas.toFixed(1)} @` : '—'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">(rendimento 52%)</p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Projeção de Abate</p>
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {diasAbate ? `${diasAbate} dias` : '—'}
            </div>
            {diasAbate && animal.peso_atual ? (
              <p className="text-xs text-muted-foreground">
                {dataAbateEstimada} (Peso-alvo: {pesoAlvo}kg)
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {animal.peso_atual && animal.peso_atual >= pesoAlvo
                  ? 'Pronto para abate'
                  : 'Sem dados suficientes'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnimalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading, profile } = useAuth();

  const animalId = params.id as string;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [eventos, setEventos] = useState<EventoRebanho[]>([]);
  const [pesos, setPesos] = useState<PesoAnimal[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoListItem[]>([]);
  const [mae, setMae] = useState<Animal | null>(null);
  const [pai, setPai] = useState<Animal | null>(null);
  const [lote, setLote] = useState<Lote | null>(null);
  const [allAnimals, setAllAnimals] = useState<Animal[]>([]);
  const [allLotes, setAllLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = profile?.perfil === 'Administrador';
  const canRegisterEvent = profile?.perfil === 'Administrador' || profile?.perfil === 'Operador';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [animaisList, lotesList] = await Promise.all([
        listAnimais({}, 1000, 0),
        listLotes(100, 0),
      ]);

      const animalData = animaisList.find((a) => a.id === animalId);
      if (!animalData) {
        toast.error('Animal não encontrado');
        router.push('/dashboard/rebanho');
        return;
      }

      setAnimal(animalData);
      setAllAnimals(animaisList);
      setAllLotes(lotesList);

      const [eventosData, pesosData, movimentacoesData] = await Promise.all([
        listEventosPorAnimal(animalId),
        listPesosPorAnimal(animalId),
        getHistoricoAnimalAction(animalId),
      ]);

      setEventos(eventosData);
      setPesos(pesosData);
      setMovimentacoes(movimentacoesData);

      if (animalData.mae_id) {
        const maeData = animaisList.find((a) => a.id === animalData.mae_id);
        setMae(maeData || null);
      }

      if (animalData.pai_id) {
        const paiData = animaisList.find((a) => a.id === animalData.pai_id);
        setPai(paiData || null);
      }

      if (animalData.lote_id) {
        const loteData = lotesList.find((l) => l.id === animalData.lote_id);
        setLote(loteData || null);
      }
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [animalId, router]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletarAnimalAction(animalId);
      if (result.success) {
        toast.success('Animal deletado com sucesso');
        router.push('/dashboard/rebanho');
      } else {
        toast.error(result.error || 'Erro ao deletar animal');
      }
    } catch (err) {
      toast.error('Erro ao deletar animal');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rebanho', href: '/dashboard/rebanho' },
    { label: animal?.brinco || 'Animal', href: `/dashboard/rebanho/${animalId}` },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-card shadow-sm p-8 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Animal não encontrado</h2>
            <p className="text-sm text-muted-foreground">O animal que você procura não existe.</p>
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
              <h1 className="text-3xl font-bold tracking-tight">Brinco: {animal.brinco}</h1>
              <p className="text-muted-foreground mt-1">{animal.categoria} • {animal.sexo}</p>
            </div>
            <div className="space-x-2">
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/rebanho/${animalId}/editar`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </Button>
                </>
              )}
              {canRegisterEvent && (
                <Button
                  onClick={() => router.push(`/dashboard/rebanho/${animalId}/evento`)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Evento
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{animal.status}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peso Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {animal.peso_atual ? `${animal.peso_atual.toFixed(1)} kg` : '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Raça</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{animal.raca || '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lote?.nome || '—'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="eventos">
          <TabsList className="bg-muted">
            <TabsTrigger value="eventos">Histórico de Eventos</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="pesos">Pesagens</TabsTrigger>
            {(mae || pai) && <TabsTrigger value="genealogia">Genealogia</TabsTrigger>}
            {animal.sexo === 'Fêmea' && ['leiteiro', 'dupla_aptidao'].includes(animal.tipo_rebanho) && (
              <TabsTrigger value="producao-leiteira">Produção Leiteira</TabsTrigger>
            )}
            {['corte', 'dupla_aptidao'].includes(animal.tipo_rebanho) && (
              <TabsTrigger value="desempenho-corte">Desempenho de Corte</TabsTrigger>
            )}
            <TabsTrigger value="sanidade">Sanidade</TabsTrigger>
          </TabsList>

          <TabsContent value="eventos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                {eventos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum evento registrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead>Usuário</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eventos.map((evento) => (
                          <TableRow key={evento.id}>
                            <TableCell>{new Date(evento.data_evento).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="font-medium capitalize">{evento.tipo}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {evento.tipo === 'pesagem' && evento.peso_kg
                                ? `${evento.peso_kg} kg`
                                : evento.observacoes || '—'}
                            </TableCell>
                            <TableCell className="text-sm">—</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movimentacoes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                {movimentacoes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma movimentação registrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacoes.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell>{formatDate(mov.data_evento)}</TableCell>
                            <TableCell>
                              <Badge className={getBadgeColorMovimentacao(mov.tipo)}>
                                {getTipoLabelMovimentacao(mov.tipo)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {getDetalhesMovimentacao(mov)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {mov.tipo === 'venda' && mov.valor_venda ? `R$ ${mov.valor_venda.toFixed(2)}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pesos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pesagens</CardTitle>
              </CardHeader>
              <CardContent>
                {pesos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma pesagem registrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Peso</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>CC</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pesos.map((peso) => (
                          <TableRow key={peso.id}>
                            <TableCell>{new Date(peso.data_pesagem).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="font-medium">{peso.peso_kg} kg</TableCell>
                            <TableCell className="text-sm">
                              {peso.metodo === 'balanca' ? 'Balança' : 'Estimativa visual'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {peso.condicao_corporal ? `${peso.condicao_corporal}/5` : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {peso.observacoes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {(mae || pai) && (
            <TabsContent value="genealogia" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Genealogia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mae && (
                    <div
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => router.push(`/dashboard/rebanho/${mae.id}`)}
                    >
                      <p className="text-sm text-muted-foreground">Mãe</p>
                      <p className="font-medium">{mae.brinco}</p>
                      <p className="text-sm">{mae.categoria}</p>
                    </div>
                  )}
                  {pai && (
                    <div
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => router.push(`/dashboard/rebanho/${pai.id}`)}
                    >
                      <p className="text-sm text-muted-foreground">Pai</p>
                      <p className="font-medium">{pai.brinco}</p>
                      <p className="text-sm">{pai.categoria}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {animal.sexo === 'Fêmea' && ['leiteiro', 'dupla_aptidao'].includes(animal.tipo_rebanho) && (
            <TabsContent value="producao-leiteira" className="mt-6">
              <AbaProducaoLeiteira
                animal={animal}
                isAdmin={isAdmin}
                canRegister={canRegisterEvent}
              />
            </TabsContent>
          )}

          {['corte', 'dupla_aptidao'].includes(animal.tipo_rebanho) && (
            <TabsContent value="desempenho-corte" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Desempenho de Corte</CardTitle>
                  <CardDescription>
                    Indicadores de ganho de peso e projeção de abate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DesempenhoCorteContent animal={animal} pesos={pesos} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="sanidade" className="mt-6">
            <AbaSanidade
              animal={animal}
              animais={allAnimals}
              lotes={allLotes}
              isAdmin={isAdmin}
              canRegister={canRegisterEvent}
            />
          </TabsContent>
        </Tabs>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deletar Animal</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar o animal {animal.brinco}? Esta ação não pode ser
                desfeita.
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
