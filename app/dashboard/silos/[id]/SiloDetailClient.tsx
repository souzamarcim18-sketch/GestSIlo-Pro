'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/lib/supabase';
import { SiloDetailHeader } from '../components/SiloDetailHeader';
import { Button } from '@/components/ui/button';
import {
  DadosSiloCard,
  RastreabilidadeCustoCard,
  InsumosCard,
  ObservacoesCard,
  type InsumoResumo,
} from '../components/tabs/VisaoGeralTab';
import { EstoqueCards, HistoricoMovimentacoes } from '../components/tabs/EstoqueTab';
import { QualidadeTab } from '../components/tabs/QualidadeTab';
import { SiloForm } from '../components/dialogs/SiloForm';
import { MovimentacaoDialog } from '../components/dialogs/MovimentacaoDialog';
import { AvaliacaoBromatologicaDialog } from '../components/dialogs/AvaliacaoBromatologicaDialog';
import { AvaliacaoPspsDialog } from '../components/dialogs/AvaliacaoPspsDialog';
import { calcularDadosSilos, calcularTaxaPerdasSilo } from '../helpers';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CustoDetalhado = { fatias: FatiaCusto[]; custoPorTonelada: number; custoTotal: number } | null;

interface Props {
  initialSilo: Silo;
  initialMovimentacoes: MovimentacaoSilo[];
  initialTalhoes: Talhao[];
  initialTalhao: Talhao | null;
  initialAvaliacoesBromatologicas: AvaliacaoBromatologica[];
  initialAvaliacoesPsps: AvaliacaoPSPS[];
  initialCusto: CustoDetalhado;
  initialInsumoLona: InsumoResumo | null;
  initialInsumoInoculante: InsumoResumo | null;
  isAdmin: boolean;
}

export function SiloDetailClient({
  initialSilo,
  initialMovimentacoes,
  initialTalhoes,
  initialTalhao,
  initialAvaliacoesBromatologicas,
  initialAvaliacoesPsps,
  initialCusto,
  initialInsumoLona,
  initialInsumoInoculante,
  isAdmin,
}: Props) {
  const router = useRouter();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'visao-geral' | 'qualidade'>('visao-geral');
  const [silo, setSilo] = useState<Silo>(initialSilo);
  const [talhao] = useState<Talhao | null>(initialTalhao);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>(initialMovimentacoes);
  const [avaliacoesBromatologicas, setAvaliacoesBromatologicas] = useState(initialAvaliacoesBromatologicas);
  const [avaliacoesPsps, setAvaliacoesPsps] = useState(initialAvaliacoesPsps);
  const [custo, setCusto] = useState<CustoDetalhado>(initialCusto);
  const [insumoLona] = useState<InsumoResumo | null>(initialInsumoLona);
  const [insumoInoculante] = useState<InsumoResumo | null>(initialInsumoInoculante);
  const [talhoes] = useState<Talhao[]>(initialTalhoes);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [movEmEdicao, setMovEmEdicao] = useState<MovimentacaoSilo | null>(null);
  const [movParaExcluir, setMovParaExcluir] = useState<MovimentacaoSilo | null>(null);
  const [isExcluindoMov, setIsExcluindoMov] = useState(false);
  const [isBromOpen, setIsBromOpen] = useState(false);
  const [isPspsOpen, setIsPspsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDependencies, setDeleteDependencies] = useState<{ movimentacoesCount: number; avaliacoesCount: number } | null>(null);
  const [carregandoDeps, setCarregandoDeps] = useState(false);

  const siloId = silo.id;

  // Recarrega os dados do silo após uma mutação. Usa router.refresh() para
  // reexecutar o RSC (fonte de verdade) e, em paralelo, atualiza o estado local
  // para feedback imediato do que muda com frequência.
  const refetch = useCallback(async () => {
    try {
      const [siloData, movsData, bromData, pspsData] = await Promise.all([
        q.silos.getById(siloId),
        q.movimentacoesSilo.listBySilo(siloId),
        q.avaliacoesBromatologicas.listBySilo(siloId),
        q.avaliacoesPsps.listBySilo(siloId),
      ]);
      setSilo(siloData);
      setMovimentacoes(movsData);
      setAvaliacoesBromatologicas(bromData);
      setAvaliacoesPsps(pspsData);
      setCusto(await getCustoSiloDetalhado(siloData));
      router.refresh();
    } catch {
      toast.error('Erro ao recarregar dados do silo');
    }
  }, [siloId, router]);

  const abrirDialogDelete = useCallback(async () => {
    setDeleteDependencies(null);
    setIsDeleteOpen(true);
    setCarregandoDeps(true);
    try {
      const validacao = await deleteSiloSafely(siloId);
      setDeleteDependencies({
        movimentacoesCount: validacao.movimentacoesCount,
        avaliacoesCount: validacao.avaliacoesCount,
      });
    } catch {
      setDeleteDependencies({ movimentacoesCount: 0, avaliacoesCount: 0 });
    } finally {
      setCarregandoDeps(false);
    }
  }, [siloId]);

  const handleDeleteSilo = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('silos').delete().eq('id', siloId);
      if (error) throw error;
      toast.success('Silo excluído com suas movimentações e avaliações.');
      setIsDeleteOpen(false);
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
      if (movParaExcluir.receita_id) {
        await removerReceitaVendaSiloAction(movParaExcluir.receita_id);
      }
      await q.movimentacoesSilo.remove(movParaExcluir.id);
      toast.success('Movimentação excluída com sucesso!');
      setMovParaExcluir(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir movimentação');
    } finally {
      setIsExcluindoMov(false);
    }
  };

  const cardData = calcularDadosSilos([silo], movimentacoes)[0];
  const { estoque, consumoDiario, estoquePara, status } = cardData;
  const taxaPerdas = calcularTaxaPerdasSilo(movimentacoes);

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <SiloDetailHeader
          silo={silo}
          status={status}
          onBack={() => router.push('/dashboard/silos')}
          onEdit={() => setIsEditOpen(true)}
          onRefresh={refetch}
          onNovaMovimentacao={() => setIsMovOpen(true)}
          talhaoNome={talhao?.nome}
          onDelete={profile?.perfil === 'Administrador' ? abrirDialogDelete : undefined}
        />

        {/* Tabs */}
        <div className="w-full space-y-6">
          <div className="flex flex-wrap gap-2">
            {(['visao-geral', 'qualidade'] as const).map((tab) => {
              const labels = { 'visao-geral': 'Visão Geral', qualidade: 'Qualidade' };
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

          {activeTab === 'visao-geral' && (
            <div className="space-y-6">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <RastreabilidadeCustoCard silo={silo} talhao={talhao} custo={custo} />
                <InsumosCard insumoLona={insumoLona} insumoInoculante={insumoInoculante} />
              </div>

              <ObservacoesCard silo={silo} />

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

        {/* Delete Confirmation Dialog — etapa única */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Deletar silo {silo.nome}</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. O silo e todos os dados
                associados serão removidos permanentemente.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                {carregandoDeps ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Verificando dados associados…
                  </p>
                ) : deleteDependencies &&
                  (deleteDependencies.movimentacoesCount > 0 || deleteDependencies.avaliacoesCount > 0) ? (
                  <>
                    <p className="text-sm font-medium text-destructive">
                      Serão excluídos junto com o silo:
                    </p>
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
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este silo não possui movimentações ou avaliações associadas.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteSilo} disabled={isDeleting || carregandoDeps}>
                {isDeleting ? 'Deletando...' : 'Excluir silo'}
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
          insumosLona={[]}
          insumosInoculante={[]}
          onSuccess={refetch}
        />
        <MovimentacaoDialog
          open={isMovOpen}
          onOpenChange={setIsMovOpen}
          silos={[silo]}
          siloId={siloId}
          estoqueAtual={estoque}
          onSuccess={refetch}
        />
        <MovimentacaoDialog
          open={!!movEmEdicao}
          onOpenChange={(open) => {
            if (!open) setMovEmEdicao(null);
          }}
          silos={[silo]}
          siloId={siloId}
          estoqueAtual={estoque}
          movimentacao={movEmEdicao}
          onSuccess={refetch}
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
              <Button type="button" variant="outline" onClick={() => setMovParaExcluir(null)} disabled={isExcluindoMov}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleExcluirMovimentacao} disabled={isExcluindoMov}>
                {isExcluindoMov ? 'Excluindo...' : 'Confirmar Exclusão'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AvaliacaoBromatologicaDialog
          open={isBromOpen}
          onOpenChange={setIsBromOpen}
          siloId={siloId}
          onSuccess={refetch}
        />
        <AvaliacaoPspsDialog
          open={isPspsOpen}
          onOpenChange={setIsPspsOpen}
          siloId={siloId}
          onSuccess={refetch}
        />
      </div>
    </div>
  );
}
