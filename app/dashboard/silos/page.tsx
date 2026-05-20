'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Database } from 'lucide-react';
import { toast } from 'sonner';
import { type Silo, type MovimentacaoSilo, type Talhao, type Insumo } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { SiloCard, SiloKpiStrip } from './components';
import { SiloForm } from './components/dialogs/SiloForm';
import { calcularDadosSilos, type SiloCardData } from './helpers';

export default function SilosPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [siloCardData, setSiloCardData] = useState<SiloCardData[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const silosData = await q.silos.list();
      const [movsData, talhoesData, insumosData] = await Promise.all([
        q.movimentacoesSilo.listBySilos(silosData.map((s) => s.id)),
        q.talhoes.list(),
        q.insumos.list(),
      ]);

      setTalhoes(talhoesData);
      setInsumos(insumosData);
      setSiloCardData(calcularDadosSilos(silosData, movsData));
    } catch {
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
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Gestão das Silagens</h2>
        <Button onClick={() => setIsAddSiloOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Silo
        </Button>
      </div>

      {/* KPI Strip */}
      {loading ? (
        <Skeleton className="h-[72px] w-full rounded-xl" />
      ) : (
        <SiloKpiStrip data={siloCardData} />
      )}

      {/* Grid de Cards */}
      <section>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                ))
              : siloCardData.map((card) => (
                  <SiloCard
                    key={card.silo.id}
                    {...card}
                    onClick={() => router.push(`/dashboard/silos/${card.silo.id}`)}
                  />
                ))}

            {/* Empty State */}
            {!loading && siloCardData.length === 0 && (
              <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
                <Database className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <CardHeader className="p-0">
                  <CardTitle className="text-muted-foreground">Nenhum silo cadastrado</CardTitle>
                  <CardDescription>Clique em &quot;Novo Silo&quot; para começar.</CardDescription>
                </CardHeader>
                <CardContent className="p-0" />
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
