'use client';

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calcularLinhasRelatorio, type RawVinculo } from '@/lib/supabase/planejamento-compras';
import PlanejamentosList from '@/components/planejamento-compras/PlanejamentosList';
import PlanejamentoForm from '@/components/planejamento-compras/PlanejamentoForm';
import FiltrosRelatorio from '@/components/planejamento-compras/FiltrosRelatorio';
import RelatorioCompras from '@/components/planejamento-compras/RelatorioCompras';
import type {
  PlanejamentoAtividadeComDetalhes,
  FiltrosRelatorio as FiltrosRelatorioType,
  LinhaRelatorioCompras,
} from '@/lib/types/planejamento-compras';

interface TalhaoOption { id: string; nome: string }
interface CicloOption  { id: string; cultura: string }

interface Props {
  initialPlanejamentos: PlanejamentoAtividadeComDetalhes[];
  initialTalhoes: TalhaoOption[];
  initialCiclos: CicloOption[];
  initialLinhasRelatorio: LinhaRelatorioCompras[];
  isAdmin: boolean;
  fazendaId: string;
}

export function PlanejamentoComprasClient({
  initialPlanejamentos,
  initialTalhoes,
  initialCiclos,
  initialLinhasRelatorio,
  isAdmin,
  fazendaId,
}: Props) {
  const [planejamentos, setPlanejamentos] = useState(initialPlanejamentos);
  const [talhoes] = useState<TalhaoOption[]>(initialTalhoes);
  const [ciclos] = useState<CicloOption[]>(initialCiclos);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlanejamentoAtividadeComDetalhes | undefined>(undefined);

  const [filtros, setFiltros] = useState<FiltrosRelatorioType>({});
  const [linhasRelatorio, setLinhasRelatorio] = useState(initialLinhasRelatorio);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  const fetchAtividades = useCallback(async () => {
    setLoadingAtividades(true);
    try {
      const { data } = await supabase
        .from('planejamentos_atividade')
        .select(`
          id, talhao_id, ciclo_id, tipo_operacao, data_prevista, status, observacoes,
          fazenda_id, created_by, created_at, updated_at,
          talhao:talhoes(id, nome, area_ha),
          ciclo:ciclos_agricolas(id, cultura),
          insumos:planejamento_insumos(
            id, planejamento_id, insumo_id, quantidade, fazenda_id, created_at,
            insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
          )
        `)
        .eq('fazenda_id', fazendaId)
        .order('data_prevista', { ascending: true });
      if (data) setPlanejamentos(data as unknown as PlanejamentoAtividadeComDetalhes[]);
    } finally {
      setLoadingAtividades(false);
    }
  }, [fazendaId]);

  const fetchRelatorio = useCallback(async (f: FiltrosRelatorioType) => {
    setLoadingRelatorio(true);
    try {
      const statusFiltro = f.status_atividade ?? 'planejada';
      let query = supabase
        .from('planejamento_insumos')
        .select(`
          insumo_id, quantidade,
          planejamento:planejamentos_atividade!inner(id, status, data_prevista, talhao_id),
          insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
        `)
        .eq('fazenda_id', fazendaId)
        .eq('planejamento.status', statusFiltro);

      if (f.data_inicio) query = query.gte('planejamento.data_prevista', f.data_inicio);
      if (f.data_fim)    query = query.lte('planejamento.data_prevista', f.data_fim);
      if (f.talhao_id)   query = query.eq('planejamento.talhao_id', f.talhao_id);

      const { data } = await query;
      setLinhasRelatorio(calcularLinhasRelatorio((data ?? []) as unknown as RawVinculo[], f));
    } finally {
      setLoadingRelatorio(false);
    }
  }, [fazendaId]);

  const handleFiltrosChange = (novosFiltros: FiltrosRelatorioType) => {
    setFiltros(novosFiltros);
    fetchRelatorio(novosFiltros);
  };

  function handleEdit(p: PlanejamentoAtividadeComDetalhes) {
    setEditTarget(p);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditTarget(undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Planejamento de Compras</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planeje atividades de campo e gerencie os insumos necessários
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova Atividade
          </Button>
        )}
      </div>

      <Tabs defaultValue="atividades">
        <TabsList variant="card">
          <TabsTrigger value="atividades">Atividades Planejadas</TabsTrigger>
          <TabsTrigger value="lista-compras">Lista de Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="atividades" className="mt-4">
          {loadingAtividades ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <PlanejamentosList
              planejamentos={planejamentos}
              isAdmin={isAdmin}
              onRefresh={fetchAtividades}
              onEdit={handleEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="lista-compras" className="mt-4 space-y-4">
          <FiltrosRelatorio
            filtros={filtros}
            talhoes={talhoes}
            onChange={handleFiltrosChange}
          />
          {loadingRelatorio ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <RelatorioCompras
              linhas={linhasRelatorio}
              isAdmin={isAdmin}
              onRefresh={() => fetchRelatorio(filtros)}
            />
          )}
        </TabsContent>
      </Tabs>

      <PlanejamentoForm
        open={formOpen}
        onOpenChange={handleFormClose}
        talhoes={talhoes}
        ciclos={ciclos}
        planejamento={editTarget}
        onSuccess={fetchAtividades}
      />
    </div>
  );
}
