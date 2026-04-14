'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, History, Database, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { type Silo, type MovimentacaoSilo, type Talhao, type Insumo } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { SiloCard } from './components/SiloCard';
import { SiloForm } from './components/dialogs/SiloForm';
import { MovimentacaoDialog } from './components/dialogs/MovimentacaoDialog';
import { calcularDadosSilos, type SiloCardData } from './helpers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SilosPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [siloCardData, setSiloCardData] = useState<SiloCardData[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [silos, setSilos] = useState<Silo[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);

  // BATCH: Fetch silos + movimentações em 2 chamadas, calcular em memória
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [silosData, movsData, talhoesData, insumosData] = await Promise.all([
        q.silos.list(),
        q.movimentacoesSilo.listBySilos((await q.silos.list()).map((s) => s.id)),
        q.talhoes.list(),
        q.insumos.list(),
      ]);

      setSilos(silosData);
      setMovimentacoes(movsData);
      setTalhoes(talhoesData);
      setInsumos(insumosData);

      // Calcular dados de cada silo em memória
      const cardData = calcularDadosSilos(silosData, movsData);
      setSiloCardData(cardData);
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  // Últimas 20 movimentações
  const ultimasMovs = movimentacoes.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Silos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddMovOpen(true)}>
            <History className="mr-2 h-4 w-4" />
            Registrar Movimentação
          </Button>
          <Button onClick={() => setIsAddSiloOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Silo
          </Button>
        </div>
      </div>

      {/* Grid de Cards */}
      <section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {siloCardData.map((card) => (
            <SiloCard
              key={card.silo.id}
              {...card}
              onClick={() => router.push(`/dashboard/silos/${card.silo.id}`)}
            />
          ))}

          {/* Empty State */}
          {siloCardData.length === 0 && !loading && (
            <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
              <Database className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-muted-foreground">Nenhum silo cadastrado</CardTitle>
              <CardDescription>
                Clique em &quot;Novo Silo&quot; para começar.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      {/* Tabela de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>Últimas 20 movimentações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Silo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimasMovs.length > 0 ? (
                  ultimasMovs.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm">
                        {format(new Date(mov.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {silos.find((s) => s.id === mov.silo_id)?.nome || 'Removido'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {mov.tipo === 'Entrada' ? (
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-amber-500" />
                          )}
                          <Badge
                            variant={mov.tipo === 'Entrada' ? 'secondary' : 'outline'}
                            className={
                              mov.tipo === 'Entrada'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }
                          >
                            {mov.tipo}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">{mov.quantidade.toFixed(1)} t</TableCell>
                      <TableCell className="text-sm">{mov.responsavel || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {mov.observacao || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SiloForm
        open={isAddSiloOpen}
        onOpenChange={setIsAddSiloOpen}
        mode="create"
        talhoes={talhoes}
        insumos={insumos}
        onSuccess={fetchData}
      />
      <MovimentacaoDialog
        open={isAddMovOpen}
        onOpenChange={setIsAddMovOpen}
        silos={silos}
        onSuccess={fetchData}
      />
    </div>
  );
}
