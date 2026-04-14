'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Database } from 'lucide-react';
import { toast } from 'sonner';
import { type Silo, type MovimentacaoSilo, type Talhao, type Insumo } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { SiloCard } from './components/SiloCard';
import { SiloForm } from './components/dialogs/SiloForm';
import { calcularDadosSilos, type SiloCardData } from './helpers';

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

  // BATCH: Fetch apenas silos + talhões + insumos (sem movimentações desnecessárias)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const silosData = await q.silos.list();
      const [movsData, talhoesData, insumosData] = await Promise.all([
        q.movimentacoesSilo.listBySilos(silosData.map((s) => s.id)),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Silos</h1>
        <Button onClick={() => setIsAddSiloOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Silo
        </Button>
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


      {/* Dialogs */}
      <SiloForm
        open={isAddSiloOpen}
        onOpenChange={setIsAddSiloOpen}
        mode="create"
        talhoes={talhoes}
        insumos={insumos}
        onSuccess={fetchData}
      />
    </div>
  );
}
