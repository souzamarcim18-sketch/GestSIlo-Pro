'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Map } from 'lucide-react';
import { toast } from 'sonner';
import { type Talhao, type CicloAgricola } from '@/lib/types/talhoes';
import { q } from '@/lib/supabase/queries-audit';
import { TalhaoCard, TalhaoForm } from './components';

interface Props {
  initialTalhoes: Talhao[];
  initialCiclosAtivos: Record<string, CicloAgricola>;
}

export function TalhoesClient({ initialTalhoes, initialCiclosAtivos }: Props) {
  const router = useRouter();
  const [talhoes, setTalhoes] = useState<Talhao[]>(initialTalhoes);
  const [ciclosAtivos, setCiclosAtivos] = useState<Record<string, CicloAgricola>>(initialCiclosAtivos);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const talhoesData = await q.talhoes.list();
      setTalhoes(talhoesData as unknown as Talhao[]);

      if (talhoesData.length > 0) {
        const ciclosData = await q.ciclosAgricolas.listByTalhoes(talhoesData.map(t => t.id));
        const ciclosMap: Record<string, CicloAgricola> = {};
        (ciclosData as unknown as CicloAgricola[]).forEach((ciclo) => {
          if (ciclo.ativo && !ciclosMap[ciclo.talhao_id]) {
            ciclosMap[ciclo.talhao_id] = ciclo;
          }
        });
        setCiclosAtivos(ciclosMap);
      }
    } catch {
      toast.error('Erro ao carregar talhões');
    }
  }, []);

  const handleAddSuccess = () => {
    setIsAddOpen(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Gestão de Lavouras e Talhões</h2>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Talhão
        </Button>
      </div>

      {talhoes.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed rounded-2xl bg-card shadow-sm">
          <Map className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-muted-foreground">Nenhum talhão cadastrado</CardTitle>
          <CardDescription>Clique em &quot;Novo Talhão&quot; para começar a gerenciar suas áreas de cultivo.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {talhoes.map((talhao) => (
            <TalhaoCard
              key={talhao.id}
              talhao={talhao}
              cicloAtivo={ciclosAtivos[talhao.id]}
              onClick={() => router.push(`/dashboard/talhoes/${talhao.id}`)}
            />
          ))}
        </div>
      )}

      <TalhaoForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        mode="create"
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
