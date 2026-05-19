'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import InsumosList from '@/components/planejamento-compras/InsumosList';
import InsumoVinculadoForm from '@/components/planejamento-compras/InsumoVinculadoForm';
import PlanejamentoForm from '@/components/planejamento-compras/PlanejamentoForm';
import type { PlanejamentoAtividadeComDetalhes } from '@/lib/types/planejamento-compras';
import type { InsumoOption } from '@/components/planejamento-compras/InsumoAutocomplete';

const STATUS_LABEL: Record<string, string> = {
  planejada: 'Planejada',
  executada: 'Executada',
  cancelada: 'Cancelada',
};

const STATUS_CLASS: Record<string, string> = {
  planejada: 'bg-[rgba(0,196,90,0.09)] text-[#00c45a] border-[rgba(0,196,90,0.2)]',
  executada: 'bg-[rgba(59,130,246,0.09)] text-blue-400 border-[rgba(59,130,246,0.2)]',
  cancelada: 'bg-[rgba(107,114,128,0.09)] text-muted-foreground border-[rgba(107,114,128,0.2)]',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlanejamentoDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.perfil === 'Administrador';

  const [planejamento, setPlanejamento] = useState<PlanejamentoAtividadeComDetalhes | null>(null);
  const [insumosDisponiveis, setInsumosDisponiveis] = useState<InsumoOption[]>([]);
  const [talhoes, setTalhoes] = useState<{ id: string; nome: string }[]>([]);
  const [ciclos, setCiclos] = useState<{ id: string; cultura: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchPlanejamento = useCallback(async () => {
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
      .eq('id', id)
      .single();

    if (data) setPlanejamento(data as unknown as PlanejamentoAtividadeComDetalhes);
  }, [id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [insumosResult, talhoesResult, ciclosResult] = await Promise.all([
        supabase
          .from('insumos')
          .select('id, nome, unidade, estoque_atual')
          .eq('ativo', true)
          .order('nome', { ascending: true }),
        supabase
          .from('talhoes')
          .select('id, nome')
          .order('nome', { ascending: true }),
        supabase
          .from('ciclos_agricolas')
          .select('id, cultura')
          .order('cultura', { ascending: true }),
      ]);

      if (insumosResult.data) setInsumosDisponiveis(insumosResult.data as InsumoOption[]);
      if (talhoesResult.data) setTalhoes(talhoesResult.data);
      if (ciclosResult.data) setCiclos(ciclosResult.data);

      await fetchPlanejamento();
      setLoading(false);
    }
    init();
  }, [fetchPlanejamento]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    );
  }

  if (!planejamento) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">Atividade não encontrada.</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Breadcrumb / voltar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => router.push('/dashboard/planejamento-compras')}
        >
          <ArrowLeft className="h-4 w-4" />
          Planejamento de Compras
        </Button>
      </div>

      {/* Header da atividade */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{planejamento.tipo_operacao}</h1>
            <Badge variant="outline" className={STATUS_CLASS[planejamento.status]}>
              {STATUS_LABEL[planejamento.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Talhão: <span className="font-medium text-foreground">{planejamento.talhao.nome}</span>
            {planejamento.talhao.area_ha && (
              <span> · {planejamento.talhao.area_ha} ha</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Data prevista:{' '}
            <span className="font-medium text-foreground">
              {format(new Date(planejamento.data_prevista + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </p>
          {planejamento.ciclo && (
            <p className="text-sm text-muted-foreground">
              Ciclo: <span className="font-medium text-foreground">{planejamento.ciclo.cultura}</span>
            </p>
          )}
          {planejamento.observacoes && (
            <p className="text-sm text-muted-foreground mt-2">{planejamento.observacoes}</p>
          )}
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      {/* Insumos vinculados */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Insumos Necessários</h2>
        <InsumosList
          insumos={planejamento.insumos}
          isAdmin={isAdmin}
          onChanged={fetchPlanejamento}
        />

        {isAdmin && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-sm font-medium mb-3">Adicionar insumo</p>
            <InsumoVinculadoForm
              planejamentoId={planejamento.id}
              insumos={insumosDisponiveis}
              onSuccess={fetchPlanejamento}
            />
          </div>
        )}
      </div>

      {/* Modal edição */}
      <PlanejamentoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        talhoes={talhoes}
        ciclos={ciclos}
        planejamento={planejamento}
        onSuccess={fetchPlanejamento}
      />
    </div>
  );
}
