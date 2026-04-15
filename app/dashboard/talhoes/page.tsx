'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Map, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Talhao, type CicloAgricola } from '@/lib/types/talhoes';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { TalhaoCard, TalhaoForm } from './components';

export default function TalhoesPage() {
  const router = useRouter();
  const { fazendaId, loading: authLoading } = useAuth();
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [ciclosAtivos, setCiclosAtivos] = useState<Record<string, CicloAgricola>>({});
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!fazendaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const talhoesData = await q.talhoes.list();
      setTalhoes(talhoesData as any);

      if (talhoesData.length > 0) {
        const ciclosData = await q.ciclosAgricolas.listByTalhoes(
          talhoesData.map(t => t.id)
        );
        const ciclosMap: Record<string, CicloAgricola> = {};
        (ciclosData as any).forEach((ciclo: any) => {
          if (ciclo.ativo && !ciclosMap[ciclo.talhao_id]) {
            ciclosMap[ciclo.talhao_id] = ciclo;
          }
        });
        setCiclosAtivos(ciclosMap);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar talhões');
    } finally {
      setLoading(false);
    }
  }, [fazendaId]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const handleCardClick = (talhaoId: string) => {
    router.push(`/dashboard/talhoes/${talhaoId}`);
  };

  const handleAddSuccess = () => {
    setIsAddOpen(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Talhões</h2>
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
                onClick={() => handleCardClick(talhao.id)}
              />
            ))}
          </div>
        )}
      </div>

      <TalhaoForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        mode="create"
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
