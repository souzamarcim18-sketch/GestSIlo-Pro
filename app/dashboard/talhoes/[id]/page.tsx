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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Talhao, type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';
import { q } from '@/lib/supabase/queries-audit';
import {
  TalhaoDetailHeader,
  TalhaoResumoTab,
  TalhaoOperacoesTab,
  TalhaoHistoricoTab,
  TalhaoForm,
} from '../components';

export default function TalhaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const talhaoId = params.id as string;

  const [talhao, setTalhao] = useState<Talhao | null>(null);
  const [ciclos, setCiclos] = useState<CicloAgricola[]>([]);
  const [atividades, setAtividades] = useState<AtividadeCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const cicloAtivo = ciclos.find((c) => c.ativo);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📍 Carregando talhão:', talhaoId);

      let talhaoData, ciclosData, atividadesData;

      try {
        console.log('🔄 Buscando detalhes do talhão...');
        talhaoData = await q.talhoes.getById(talhaoId);
        console.log('✅ Talhão carregado:', talhaoData);
      } catch (e) {
        console.error('❌ Erro ao carregar talhão:', e);
        throw new Error(`Falha ao buscar talhão: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      try {
        console.log('🔄 Buscando ciclos agrícolas...');
        ciclosData = await q.ciclosAgricolas.listByTalhoes([talhaoId]);
        console.log('✅ Ciclos carregados:', ciclosData?.length || 0);
      } catch (e) {
        console.error('❌ Erro ao carregar ciclos:', e);
        throw new Error(`Falha ao buscar ciclos: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      try {
        console.log('🔄 Buscando atividades de campo...');
        atividadesData = await q.atividadesCampo.listByTalhao(talhaoId);
        console.log('✅ Atividades carregadas:', atividadesData?.length || 0);
      } catch (e) {
        console.error('❌ Erro ao carregar atividades:', e);
        throw new Error(`Falha ao buscar atividades: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      setTalhao((talhaoData as any) || null);
      setCiclos((ciclosData as any) || []);
      setAtividades((atividadesData as any) || []);
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
          cicloAtivo={cicloAtivo}
          onEdit={() => setIsEditOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
        />

        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resumo">Resumo e Custos</TabsTrigger>
            <TabsTrigger value="operacoes">Operações Agrícolas</TabsTrigger>
            <TabsTrigger value="historico">Histórico e Calendário</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <TalhaoResumoTab
              talhao={talhao}
              cicloAtivo={cicloAtivo}
              atividades={atividades}
              onEditTalhao={() => setIsEditOpen(true)}
              onDeleteTalhao={() => setIsDeleteOpen(true)}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="operacoes" className="space-y-4">
            <TalhaoOperacoesTab
              talhaoId={talhaoId}
              talhaoAreaHa={talhao?.area_ha}
              cicloAtivo={cicloAtivo}
              atividades={atividades}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <TalhaoHistoricoTab ciclos={ciclos} />
          </TabsContent>
        </Tabs>
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
