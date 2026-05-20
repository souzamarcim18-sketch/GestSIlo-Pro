'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
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
import type { PlanejamentoAtividadeComDetalhes, FiltrosRelatorio as FiltrosRelatorioType, LinhaRelatorioCompras } from '@/lib/types/planejamento-compras';

interface TalhaoOption {
  id: string;
  nome: string;
}

interface CicloOption {
  id: string;
  cultura: string;
}

export default function PlanejamentoComprasPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === 'Administrador';
  const fazendaId = profile?.fazenda_id;

  // ── Aba Atividades ─────────────────────────────────────────────────────────
  const [planejamentos, setPlanejamentos] = useState<PlanejamentoAtividadeComDetalhes[]>([]);
  const [talhoes, setTalhoes] = useState<TalhaoOption[]>([]);
  const [ciclos, setCiclos] = useState<CicloOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlanejamentoAtividadeComDetalhes | undefined>(undefined);

  // ── Aba Relatório ──────────────────────────────────────────────────────────
  const [filtros, setFiltros] = useState<FiltrosRelatorioType>({});
  const [linhasRelatorio, setLinhasRelatorio] = useState<LinhaRelatorioCompras[]>([]);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  // Carrega dados da aba Atividades + lista de talhões/ciclos
  const fetchData = useCallback(async () => {
    if (!fazendaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [plResult, talhaoResult, cicloResult] = await Promise.all([
        supabase
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
          .order('data_prevista', { ascending: true }),
        supabase
          .from('talhoes')
          .select('id, nome')
          .eq('fazenda_id', fazendaId)
          .order('nome', { ascending: true }),
        supabase
          .from('ciclos_agricolas')
          .select('id, cultura')
          .eq('ativo', true)
          .order('cultura', { ascending: true }),
      ]);

      if (plResult.data) setPlanejamentos(plResult.data as unknown as PlanejamentoAtividadeComDetalhes[]);
      if (talhaoResult.data) setTalhoes(talhaoResult.data);
      if (cicloResult.data) setCiclos(cicloResult.data);
    } finally {
      setLoading(false);
    }
  }, [fazendaId]);

  // Carrega dados do relatório (aba Lista de Compras)
  const fetchRelatorio = useCallback(async () => {
    if (!fazendaId) {
      setLoadingRelatorio(false);
      return;
    }
    setLoadingRelatorio(true);
    try {
      const statusFiltro = filtros.status_atividade ?? 'planejada';

      let query = supabase
        .from('planejamento_insumos')
        .select(`
          insumo_id, quantidade,
          planejamento:planejamentos_atividade!inner(
            id, status, data_prevista, talhao_id
          ),
          insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
        `)
        .eq('fazenda_id', fazendaId)
        .eq('planejamento.status', statusFiltro);

      if (filtros.data_inicio) {
        query = query.gte('planejamento.data_prevista', filtros.data_inicio);
      }
      if (filtros.data_fim) {
        query = query.lte('planejamento.data_prevista', filtros.data_fim);
      }
      if (filtros.talhao_id) {
        query = query.eq('planejamento.talhao_id', filtros.talhao_id);
      }

      const { data } = await query;
      const vinculos = (data ?? []) as unknown as RawVinculo[];
      setLinhasRelatorio(calcularLinhasRelatorio(vinculos, filtros));
    } finally {
      setLoadingRelatorio(false);
    }
  }, [filtros, fazendaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchRelatorio();
  }, [fetchRelatorio]);

  function handleEdit(p: PlanejamentoAtividadeComDetalhes) {
    setEditTarget(p);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditTarget(undefined);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planejamento de Compras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planeje atividades de campo e gerencie os insumos necessários
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditTarget(undefined);
              setFormOpen(true);
            }}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nova Atividade
          </Button>
        )}
      </div>

      {/* Abas */}
      <Tabs defaultValue="atividades">
        <TabsList>
          <TabsTrigger value="atividades">Atividades Planejadas</TabsTrigger>
          <TabsTrigger value="lista-compras">Lista de Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="atividades" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <PlanejamentosList
              planejamentos={planejamentos}
              isAdmin={isAdmin}
              onRefresh={fetchData}
              onEdit={handleEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="lista-compras" className="mt-4 space-y-4">
          <FiltrosRelatorio
            filtros={filtros}
            talhoes={talhoes}
            onChange={setFiltros}
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
              onRefresh={fetchRelatorio}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de criação/edição */}
      <PlanejamentoForm
        open={formOpen}
        onOpenChange={handleFormClose}
        talhoes={talhoes}
        ciclos={ciclos}
        planejamento={editTarget}
        onSuccess={fetchData}
      />
    </div>
  );
}
