'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
  getAnimalById,
  getLoteById,
} from '@/lib/supabase/rebanho';
import { getHistoricoAnimalAction } from '@/lib/supabase/rebanho-movimentacoes-actions';
import type { MovimentacaoListItem } from '@/lib/supabase/rebanho-movimentacoes';
import { ResumoLeiteira } from '@/components/rebanho/ResumoLeiteira';
import { ResumoSanidade } from '@/components/rebanho/ResumoSanidade';
import { DesempenhoCorteResumo } from '@/components/rebanho/corte/DesempenhoCorteResumo';
import { deletarAnimalAction } from '../actions';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  getBadgeColorMovimentacao,
  getTipoLabelMovimentacao,
  getDetalhesMovimentacao,
  formatarIdadeAnimal,
} from '@/lib/utils/rebanho-ficha';
import type { Animal, EventoRebanho, PesoAnimal, Lote } from '@/lib/types/rebanho';

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
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = profile?.perfil === 'Administrador';
  const canRegisterEvent = profile?.perfil === 'Administrador' || profile?.perfil === 'Operador';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Busca por id — substitui o anti-padrão de carregar 1000 animais / 100 lotes.
      const animalData = await getAnimalById(animalId);
      if (!animalData) {
        toast.error('Animal não encontrado');
        router.push('/dashboard/rebanho');
        return;
      }

      setAnimal(animalData);

      // Demais dados do animal + genealogia/lote resolvidos por id, em paralelo.
      const [eventosData, pesosData, movimentacoesData, maeData, paiData, loteData] =
        await Promise.all([
          listEventosPorAnimal(animalId),
          listPesosPorAnimal(animalId),
          getHistoricoAnimalAction(animalId),
          animalData.mae_id ? getAnimalById(animalData.mae_id) : Promise.resolve(null),
          animalData.pai_id ? getAnimalById(animalData.pai_id) : Promise.resolve(null),
          animalData.lote_id ? getLoteById(animalData.lote_id) : Promise.resolve(null),
        ]);

      setEventos(eventosData);
      setPesos(pesosData);
      setMovimentacoes(movimentacoesData);
      setMae(maeData);
      setPai(paiData);
      setLote(loteData);
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
          <div className="flex items-start justify-between gap-4">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Data de Nascimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {animal.data_nascimento
                  ? new Date(animal.data_nascimento).toLocaleDateString('pt-BR')
                  : '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Idade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarIdadeAnimal(animal.data_nascimento)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="eventos">
          <TabsList variant="card">
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
                          <TableHead className="text-sm font-medium">Data</TableHead>
                          <TableHead className="text-sm font-medium">Tipo</TableHead>
                          <TableHead className="text-sm font-medium">Detalhes</TableHead>
                          <TableHead className="text-sm font-medium">Usuário</TableHead>
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
                          <TableHead className="text-sm font-medium">Data</TableHead>
                          <TableHead className="text-sm font-medium">Tipo</TableHead>
                          <TableHead className="text-sm font-medium">Detalhes</TableHead>
                          <TableHead className="text-sm font-medium">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacoes.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell>{formatDate(mov.data_evento)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getBadgeColorMovimentacao(mov.tipo)}>
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
                          <TableHead className="text-sm font-medium">Data</TableHead>
                          <TableHead className="text-sm font-medium">Peso</TableHead>
                          <TableHead className="text-sm font-medium">Método</TableHead>
                          <TableHead className="text-sm font-medium">CC</TableHead>
                          <TableHead className="text-sm font-medium">Observações</TableHead>
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
              <ResumoLeiteira animal={animal} />
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
                  <DesempenhoCorteResumo animal={animal} pesos={pesos} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="sanidade" className="mt-6">
            <ResumoSanidade animal={animal} />
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
