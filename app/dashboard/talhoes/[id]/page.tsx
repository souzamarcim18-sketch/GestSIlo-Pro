'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Talhao, type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import {
  TalhaoDetailHeader,
  TalhaoVisaoGeralTab,
  TalhaoHistoricoTab,
  TalhaoForm,
} from '../components';

export default function TalhaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const talhaoId = params.id as string;

  const [activeTab, setActiveTab] = useState<'visaoGeral' | 'historico'>('visaoGeral');
  const [talhao, setTalhao] = useState<Talhao | null>(null);
  const [ciclos, setCiclos] = useState<CicloAgricola[]>([]);
  const [atividades, setAtividades] = useState<AtividadeCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAtividadeOpen, setIsAtividadeOpen] = useState(false);

  const cicloAtivo = ciclos.find((c) => c.ativo);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let talhaoData, ciclosData, atividadesData;

      try {
        talhaoData = await q.talhoes.getById(talhaoId);
      } catch (e) {
        throw new Error(`Falha ao buscar talhão: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      try {
        ciclosData = await q.ciclosAgricolas.listByTalhoes([talhaoId]);
      } catch (e) {
        throw new Error(`Falha ao buscar ciclos: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      try {
        atividadesData = await q.atividadesCampo.listByTalhao(talhaoId);
      } catch (e) {
        throw new Error(`Falha ao buscar atividades: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      setTalhao((talhaoData as unknown as Talhao) || null);
      setCiclos((ciclosData as unknown as CicloAgricola[]) || []);
      setAtividades((atividadesData as unknown as AtividadeCampo[]) || []);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido ao carregar talhão';
      console.error('🚨 Erro final:', errorMsg);
      toast.error(errorMsg);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [talhaoId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    try {
      await q.talhoes.remove(talhaoId);
      toast.success('Talhão deletado com sucesso!');
      router.push('/dashboard/talhoes');
    } catch (error) {
      console.error('Erro ao deletar talhão:', error);
      toast.error('Erro ao deletar talhão');
    }
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

  if (!talhao) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Talhão não encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <TalhaoDetailHeader
          talhao={talhao}
          onEdit={() => setIsEditOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
          onRegistrarOperacao={
            activeTab === 'visaoGeral' ? () => setIsAtividadeOpen(true) : undefined
          }
          profile={profile}
        />

        <div className="w-full space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['visaoGeral', 'historico'] as const).map((tab) => {
              const labels = { visaoGeral: 'Visão Geral & Operações', historico: 'Histórico' };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === tab
                      ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-accent/50 hover:border-primary/30'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {activeTab === 'visaoGeral' && (
            <TalhaoVisaoGeralTab
              talhao={talhao}
              talhaoId={talhaoId}
              cicloAtivo={cicloAtivo}
              atividades={atividades}
              onRefresh={fetchData}
              isDialogOpen={isAtividadeOpen}
              onDialogOpenChange={setIsAtividadeOpen}
            />
          )}
          {activeTab === 'historico' && (
            <TalhaoHistoricoTab ciclos={ciclos} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <TalhaoForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        talhao={talhao}
        onSuccess={fetchData}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Talhão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o talhão &quot;{talhao.nome}&quot;? Esta ação é
              irreversível e removerá todos os ciclos e atividades associados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
