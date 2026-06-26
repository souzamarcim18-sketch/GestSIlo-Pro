// app/dashboard/silos/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { getCustoSiloDetalhado, type FatiaCusto } from '@/lib/supabase/silos';
import { deleteSiloSafely } from '@/lib/supabase/safe-delete';
import { removerReceitaVendaSiloAction } from '../actions';
import { supabase } from '@/lib/supabase';
import {
  type Silo,
  type MovimentacaoSilo,
  type Talhao,
  type AvaliacaoBromatologica,
  type AvaliacaoPSPS,
  type Insumo,
} from '@/lib/supabase';
import { SiloDetailHeader } from '../components/SiloDetailHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DadosSiloCard,
  RastreabilidadeCustoCard,
  InsumosCard,
  ObservacoesCard,
} from '../components/tabs/VisaoGeralTab';
import { EstoqueCards, HistoricoMovimentacoes } from '../components/tabs/EstoqueTab';
import { QualidadeTab } from '../components/tabs/QualidadeTab';
import { SiloForm } from '../components/dialogs/SiloForm';
import { MovimentacaoDialog } from '../components/dialogs/MovimentacaoDialog';
import { AvaliacaoBromatologicaDialog } from '../components/dialogs/AvaliacaoBromatologicaDialog';
import { AvaliacaoPspsDialog } from '../components/dialogs/AvaliacaoPspsDialog';
import {
  calcularDadosSilos,
  calcularTaxaPerdasSilo,
} from '../helpers';
import { toast } from 'sonner';
import { AlertTriangle, Loader } from 'lucide-react';
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
  const { loading: authLoading, profile } = useAuth();

  const siloId = params.id as string;
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'qualidade'>('visao-geral');
  const [silo, setSilo] = useState<Silo | null>(null);
  const [talhao, setTalhao] = useState<Talhao | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [avaliacoesBromatologicas, setAvaliacoesBromatologicas] = useState<AvaliacaoBromatologica[]>([]);
  const [avaliacoesPsps, setAvaliacoesPsps] = useState<AvaliacaoPSPS[]>([]);
  const [custo, setCusto] = useState<{ fatias: FatiaCusto[]; custoPorTonelada: number; custoTotal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [movEmEdicao, setMovEmEdicao] = useState<MovimentacaoSilo | null>(null);
  const [movParaExcluir, setMovParaExcluir] = useState<MovimentacaoSilo | null>(null);
  const [isExcluindoMov, setIsExcluindoMov] = useState(false);
  const [isBromOpen, setIsBromOpen] = useState(false);
  const [isPspsOpen, setIsPspsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [deleteDependencies, setDeleteDependencies] = useState<{ movimentacoesCount: number; avaliacoesCount: number } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [insumoLona, setInsumoLona] = useState<Insumo | null>(null);
  const [insumoInoculante, setInsumoInoculante] = useState<Insumo | null>(null);

  // Fetch dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [siloData, movsData, talhoesData, bromData, pspsData] = await Promise.all([
        q.silos.getById(siloId),
        q.movimentacoesSilo.listBySilo(siloId),
        q.talhoes.list(),
        q.avaliacoesBromatologicas.listBySilo(siloId),
        q.avaliacoesPsps.listBySilo(siloId),
      ]);

      setSilo(siloData);
      setMovimentacoes(movsData);
      setTalhoes(talhoesData);
      setAvaliacoesBromatologicas(bromData);
      setAvaliacoesPsps(pspsData);

      // Calcular custo detalhado do silo
      const custoData = await getCustoSiloDetalhado(siloData);
      setCusto(custoData);

      // Buscar talhão se houver (guard para null)
      let talData: Talhao | null = null;
      if (siloData.talhao_id) {
        talData = await q.talhoes.getById(siloData.talhao_id);
      }
      setTalhao(talData);

      // Buscar dados dos insumos (lona e inoculante)
      const [lonaData, inocData] = await Promise.all([
        siloData.insumo_lona_id ? q.insumos.getById(siloData.insumo_lona_id).catch(() => null) : Promise.resolve(null),
        siloData.insumo_inoculante_id ? q.insumos.getById(siloData.insumo_inoculante_id).catch(() => null) : Promise.resolve(null),
      ]);
      setInsumoLona(lonaData);
      setInsumoInoculante(inocData);
    } catch (err) {
      toast.error('Erro ao carregar dados do silo');
      router.push('/dashboard/silos');
    } finally {
      setLoading(false);
    }
  }, [siloId, router]);

  const handleCheckDelete = async () => {
    if (!silo) return;
    setIsDeleting(true);
    try {
      const validacao = await deleteSiloSafely(silo.id);
      setDeleteDependencies({
        movimentacoesCount: validacao.movimentacoesCount,
        avaliacoesCount: validacao.avaliacoesCount,
      });
      setShowDeleteConfirmation(true);
    } catch (err) {
      toast.error('Erro ao verificar dependências');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSilo = async () => {
    if (!silo) return;
    setIsDeleting(true);
    try {
      // Chamar remoção diretamente sem validação (já foi feita)
      const { error } = await supabase
        .from('silos')
        .delete()
        .eq('id', silo.id);

      if (error) throw error;

      toast.success('Silo deletado com sucesso junto com suas movimentações e avaliações!');
      setIsDeleteOpen(false);
      setShowDeleteConfirmation(false);
      router.push('/dashboard/silos');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar silo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExcluirMovimentacao = async () => {
    if (!movParaExcluir) return;
    setIsExcluindoMov(true);
    try {
      // Cleanup do financeiro: remove a receita vinculada antes da movimentação.
      if (movParaExcluir.receita_id) {
        await removerReceitaVendaSiloAction(movParaExcluir.receita_id);
      }
      await q.movimentacoesSilo.remove(movParaExcluir.id);
      toast.success('Movimentação excluída com sucesso!');
      setMovParaExcluir(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir movimentação');
    } finally {
      setIsExcluindoMov(false);
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
      <div className="p-6 md:p-8">
          <Card className="rounded-2xl bg-card shadow-sm p-8 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Silo não encontrado</h2>
            <p className="text-sm text-muted-foreground">O silo que você procura não existe.</p>
          </div>
        </Card>
      </div>
    );
  }

  // Calcular dados em memória
  const cardData = calcularDadosSilos([silo], movimentacoes)[0];
  const { estoque, consumoDiario, estoquePara, status } = cardData;
  const taxaPerdas = calcularTaxaPerdasSilo(movimentacoes);

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <SiloDetailHeader
          silo={silo}
          status={status}
          onBack={() => router.back()}
          onEdit={() => setIsEditOpen(true)}
          onRefresh={fetchData}
          onNovaMovimentacao={() => setIsMovOpen(true)}
          talhaoNome={talhao?.nome}
          onDelete={
            profile?.perfil === 'Administrador'
              ? () => {
                  setDeleteDependencies(null);
                  setShowDeleteConfirmation(false);
                  setIsDeleteOpen(true);
                }
              : undefined
          }
        />

      {/* Tabs */}
      <div className="w-full space-y-6">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted/50 border border-border p-[3px]">
          {(['visao-geral', 'qualidade'] as const).map((tab) => {
            const labels = { 'visao-geral': 'Visão Geral', qualidade: 'Qualidade' };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#00A651] text-white font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {activeTab === 'visao-geral' && (
          <div className="space-y-6">
            {/* Linha 1: Dados do Silo (esquerda) + 4 cards de estoque (direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <DadosSiloCard silo={silo} />
              <EstoqueCards
                movimentacoes={movimentacoes}
                estoque={estoque}
                consumoDiario={consumoDiario}
                estoquePara={estoquePara}
                taxaPerdas={taxaPerdas}
              />
            </div>

            {/* Linha 2: Rastreabilidade & Custo + Insumos lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <RastreabilidadeCustoCard silo={silo} talhao={talhao} custo={custo} />
              <InsumosCard insumoLona={insumoLona} insumoInoculante={insumoInoculante} />
            </div>

            {/* Observações (largura total) */}
            <ObservacoesCard silo={silo} />

            {/* Histórico de movimentações (largura total) */}
            <HistoricoMovimentacoes
              movimentacoes={movimentacoes}
              estoque={estoque}
              isAdmin={profile?.perfil === 'Administrador'}
              onEdit={(mov) => setMovEmEdicao(mov)}
              onDelete={(mov) => setMovParaExcluir(mov)}
            />
          </div>
        )}
        {activeTab === 'qualidade' && (
          <QualidadeTab
            siloId={siloId}
            avaliacoesBromatologicas={avaliacoesBromatologicas}
            avaliacoesPsps={avaliacoesPsps}
            onNovaBromatologica={() => setIsBromOpen(true)}
            onNovaPsps={() => setIsPspsOpen(true)}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deletar Silo</DialogTitle>
          </DialogHeader>

          {!showDeleteConfirmation ? (
            <>
              <DialogDescription>
                Clique em &quot;Verificar&quot; para ver as dependências associadas antes de deletar o silo <strong>{silo?.nome}</strong>.
              </DialogDescription>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCheckDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Verificando...' : 'Verificar'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium text-destructive">
                    Este silo possui as seguintes dependências que serão deletadas:
                  </p>
                  {deleteDependencies && (
                    <ul className="text-sm space-y-1 ml-4">
                      {deleteDependencies.movimentacoesCount > 0 && (
                        <li className="list-disc">
                          <strong>{deleteDependencies.movimentacoesCount}</strong> movimentação(ões) de estoque
                        </li>
                      )}
                      {deleteDependencies.avaliacoesCount > 0 && (
                        <li className="list-disc">
                          <strong>{deleteDependencies.avaliacoesCount}</strong> avaliação(ões) bromatológica(s) ou PSPS
                        </li>
                      )}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Tem certeza que deseja deletar o silo <strong>{silo?.nome}</strong> e todos os seus dados associados? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setDeleteDependencies(null);
                  }}
                  disabled={isDeleting}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteSilo}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deletando...' : 'Confirmar Deleção'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

        {/* Dialogs */}
        <SiloForm
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          mode="edit"
          silo={silo}
          talhoes={talhoes}
          insumosLona={[]}
          insumosInoculante={[]}
          onSuccess={fetchData}
        />
        <MovimentacaoDialog
          open={isMovOpen}
          onOpenChange={setIsMovOpen}
          silos={[silo]}
          siloId={siloId}
          onSuccess={fetchData}
        />
        <MovimentacaoDialog
          open={!!movEmEdicao}
          onOpenChange={(open) => {
            if (!open) setMovEmEdicao(null);
          }}
          silos={[silo]}
          siloId={siloId}
          movimentacao={movEmEdicao}
          onSuccess={fetchData}
        />

        {/* Confirmação de exclusão de movimentação */}
        <Dialog
          open={!!movParaExcluir}
          onOpenChange={(open) => {
            if (!open) setMovParaExcluir(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir Movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <DialogDescription>
                Tem certeza que deseja excluir esta movimentação de{' '}
                <strong>{movParaExcluir?.tipo}</strong>
                {movParaExcluir?.subtipo ? ` (${movParaExcluir.subtipo})` : ''} de{' '}
                <strong>{movParaExcluir?.quantidade.toFixed(2)} t</strong>? Esta ação não pode ser desfeita.
              </DialogDescription>
              {movParaExcluir?.receita_id && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">
                    A receita lançada no Financeiro para esta venda também será removida.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMovParaExcluir(null)}
                disabled={isExcluindoMov}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleExcluirMovimentacao}
                disabled={isExcluindoMov}
              >
                {isExcluindoMov ? 'Excluindo...' : 'Confirmar Exclusão'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
    </div>
  );
}
