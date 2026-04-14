// app/dashboard/silos/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { type Silo, type MovimentacaoSilo, type Talhao } from '@/lib/supabase';
import { SiloDetailHeader } from '../components/SiloDetailHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VisaoGeralTab } from '../components/tabs/VisaoGeralTab';
import { EstoqueTab } from '../components/tabs/EstoqueTab';
import { QualidadeTab } from '../components/tabs/QualidadeTab';
import { SiloForm } from '../components/dialogs/SiloForm';
import { MovimentacaoDialog } from '../components/dialogs/MovimentacaoDialog';
import { AvaliacaoBromatologicaDialog } from '../components/dialogs/AvaliacaoBromatologicaDialog';
import { AvaliacaoPspsDialog } from '../components/dialogs/AvaliacaoPspsDialog';
import { calcularDadosSilos } from '../helpers';
import { toast } from 'sonner';
import { AlertTriangle, Loader, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SiloDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading } = useAuth();

  const siloId = params.id as string;
  const [silo, setSilo] = useState<Silo | null>(null);
  const [talhao, setTalhao] = useState<Talhao | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isBromOpen, setIsBromOpen] = useState(false);
  const [isPspsOpen, setIsPspsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);

  // Fetch dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [silosData, movsData, talhoesData] = await Promise.all([
        q.silos.list(),
        q.movimentacoesSilo.listBySilo(siloId),
        q.talhoes.list(),
      ]);

      const siloData = silosData.find((s) => s.id === siloId);
      if (!siloData) {
        toast.error('Silo não encontrado');
        router.push('/dashboard/silos');
        return;
      }

      setSilo(siloData);
      setMovimentacoes(movsData);
      setTalhoes(talhoesData);

      // Buscar talhão se houver (guard para null)
      let talData: Talhao | null = null;
      if (siloData.talhao_id) {
        talData = await q.talhoes.getById(siloData.talhao_id);
      }
      setTalhao(talData);
    } catch (err) {
      toast.error('Erro ao carregar dados do silo');
      router.push('/dashboard/silos');
    } finally {
      setLoading(false);
    }
  }, [siloId, router]);

  const handleDeleteSilo = async () => {
    if (!silo) return;
    setIsDeleting(true);
    try {
      await q.silos.remove(silo.id);
      toast.success('Silo deletado com sucesso!');
      setIsDeleteOpen(false);
      router.push('/dashboard/silos');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar silo');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!silo) {
    return (
      <Card className="p-8 flex items-center gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Silo não encontrado</h2>
          <p className="text-sm text-muted-foreground">O silo que você procura não existe.</p>
        </div>
      </Card>
    );
  }

  // Calcular dados em memória
  const cardData = calcularDadosSilos([silo], movimentacoes)[0];
  const { estoque, consumoDiario, estoquePara, status } = cardData;

  // Volume total calculado pelas dimensões do silo
  const volumeTotal =
    silo.comprimento_m && silo.largura_m && silo.altura_m
      ? silo.comprimento_m * silo.largura_m * silo.altura_m
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <SiloDetailHeader
            silo={silo}
            status={status}
            onBack={() => router.back()}
            onEdit={() => setIsEditOpen(true)}
            talhaoNome={talhao?.nome}
          />
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setIsDeleteOpen(true)}
          className="gap-2"
          aria-label="Deletar silo"
        >
          <Trash2 className="h-4 w-4" />
          Deletar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <VisaoGeralTab
            silo={silo}
            talhao={talhao}
            custo={null}
            densidade={null}
            insumoLona={null}
            insumoInoculante={null}
            onEdit={() => setIsEditOpen(true)}
          />
        </TabsContent>

        <TabsContent value="estoque" className="mt-6">
          <EstoqueTab
            siloId={siloId}
            volumeTotal={volumeTotal ?? 0}
            movimentacoes={movimentacoes}
            estoque={estoque}
            consumoDiario={consumoDiario}
            estoquePara={estoquePara}
            onNovaMovimentacao={() => setIsMovOpen(true)}
          />
        </TabsContent>

        <TabsContent value="qualidade" className="mt-6">
          <QualidadeTab
            siloId={siloId}
            avaliacoesBromatologicas={[]}
            avaliacoesPsps={[]}
            onNovaBromatologica={() => setIsBromOpen(true)}
            onNovaPsps={() => setIsPspsOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Silo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o silo <strong>{silo?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSilo}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <SiloForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        silo={silo}
        talhoes={talhoes}
        insumos={[]}
        onSuccess={fetchData}
      />
      <MovimentacaoDialog
        open={isMovOpen}
        onOpenChange={setIsMovOpen}
        silos={[silo]}
        siloId={siloId}
        onSuccess={fetchData}
      />
      <AvaliacaoBromatologicaDialog
        open={isBromOpen}
        onOpenChange={setIsBromOpen}
        siloId={siloId}
        onSuccess={fetchData}
      />
      <AvaliacaoPspsDialog
        open={isPspsOpen}
        onOpenChange={setIsPspsOpen}
        siloId={siloId}
        onSuccess={fetchData}
      />
    </div>
  );
}
