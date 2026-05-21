'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Database } from 'lucide-react';
import { toast } from 'sonner';
import { type Silo, type MovimentacaoSilo, type Talhao, type Insumo } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { SiloCard, SiloKpiStrip } from './components';
import { SiloForm } from './components/dialogs/SiloForm';
import { calcularDadosSilos, type SiloCardData } from './helpers';

interface Props {
  initialSiloCardData: SiloCardData[];
  initialTalhoes: Talhao[];
  initialInsumos: Insumo[];
}

export function SilosClient({ initialSiloCardData, initialTalhoes, initialInsumos }: Props) {
  const router = useRouter();
  const [siloCardData, setSiloCardData] = useState<SiloCardData[]>(initialSiloCardData);
  const [talhoes] = useState<Talhao[]>(initialTalhoes);
  const [insumos] = useState<Insumo[]>(initialInsumos);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const silosData = await q.silos.list();
      const movsData = await q.movimentacoesSilo.listBySilos(silosData.map((s) => s.id));
      setSiloCardData(calcularDadosSilos(silosData, movsData));
    } catch {
      toast.error('Erro ao carregar dados');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Gestão de Silagens</h2>
        <Button onClick={() => setIsAddSiloOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Silo
        </Button>
      </div>

      <SiloKpiStrip data={siloCardData} />

      <section>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {siloCardData.map((card) => (
            <SiloCard
              key={card.silo.id}
              {...card}
              onClick={() => router.push(`/dashboard/silos/${card.silo.id}`)}
            />
          ))}

          {siloCardData.length === 0 && (
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
