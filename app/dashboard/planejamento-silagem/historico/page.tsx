'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import {
  listPlanejamentosAction,
  deletePlanejamentoAction,
  updatePlanejamentoNomeAction,
} from '../actions';
import { TabelaHistorico } from './components/TabelaHistorico';
import { DialogDetalhes } from './components/DialogDetalhes';
import { DialogExcluir } from './components/DialogExcluir';
import { DialogEditarNome } from './components/DialogEditarNome';

export default function HistoricoPage() {
  const router = useRouter();
  const [planejamentos, setPlanejamentos] = useState<PlanejamentoSilagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog Detalhes
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [planejamentoSelecionado, setPlanejamentoSelecionado] =
    useState<PlanejamentoSilagem | null>(null);

  // Dialog Deletar
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [planejamentoParaExcluir, setPlanejamentoParaExcluir] =
    useState<PlanejamentoSilagem | null>(null);
  const [isDeletando, setIsDeletando] = useState(false);

  // Dialog Editar Nome
  const [editarOpen, setEditarOpen] = useState(false);
  const [planejamentoParaEditar, setPlanejamentoParaEditar] =
    useState<PlanejamentoSilagem | null>(null);
  const [isEditando, setIsEditando] = useState(false);

  // Carregar planejamentos
  useEffect(() => {
    async function loadPlanejamentos() {
      try {
        const result = await listPlanejamentosAction();
        if (result.success && result.data) {
          setPlanejamentos(result.data);
        } else {
          toast.error(result.error || 'Erro ao carregar planejamentos');
        }
      } catch (error) {
        console.error('Erro ao carregar:', error);
        toast.error('Erro ao carregar planejamentos');
      } finally {
        setIsLoading(false);
      }
    }

    loadPlanejamentos();
  }, []);

  // Handlers
  const handleView = (id: string) => {
    const planejamento = planejamentos.find((p) => p.id === id);
    if (planejamento) {
      setPlanejamentoSelecionado(planejamento);
      setDetalhesOpen(true);
    }
  };

  const handleEdit = (id: string) => {
    const planejamento = planejamentos.find((p) => p.id === id);
    if (planejamento) {
      setPlanejamentoParaEditar(planejamento);
      setEditarOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    const planejamento = planejamentos.find((p) => p.id === id);
    if (planejamento) {
      setPlanejamentoParaExcluir(planejamento);
      setExcluirOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!planejamentoParaExcluir) return;

    setIsDeletando(true);
    try {
      const result = await deletePlanejamentoAction(planejamentoParaExcluir.id);
      if (result.success) {
        toast.success('Planejamento deletado com sucesso');
        setPlanejamentos((prev) =>
          prev.filter((p) => p.id !== planejamentoParaExcluir.id)
        );
        setExcluirOpen(false);
        setPlanejamentoParaExcluir(null);
      } else {
        toast.error(result.error || 'Erro ao deletar');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar planejamento');
    } finally {
      setIsDeletando(false);
    }
  };

  const handleConfirmEdit = async (novoNome: string) => {
    if (!planejamentoParaEditar) return;

    setIsEditando(true);
    try {
      const result = await updatePlanejamentoNomeAction(
        planejamentoParaEditar.id,
        novoNome
      );
      if (result.success && result.data) {
        toast.success('Nome atualizado com sucesso');
        setPlanejamentos((prev) =>
          prev.map((p) =>
            p.id === result.data!.id ? result.data! : p
          )
        );
        setEditarOpen(false);
        setPlanejamentoParaEditar(null);
      } else {
        toast.error(result.error || 'Erro ao atualizar');
      }
    } catch (error) {
      console.error('Erro ao editar:', error);
      toast.error('Erro ao atualizar planejamento');
    } finally {
      setIsEditando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/planejamento-silagem" className="hover:text-foreground">
          Planejamento Silagem
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span>Histórico</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Planejamentos</h1>
          <p className="text-muted-foreground mt-2">
            {planejamentos.length > 0
              ? `${planejamentos.length} planejamento${planejamentos.length !== 1 ? 's' : ''} salvo${planejamentos.length !== 1 ? 's' : ''}`
              : 'Nenhum planejamento salvo ainda'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/dashboard/planejamento-silagem')}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Novo Planejamento
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Planejamentos</CardTitle>
          <CardDescription>
            Visualize, edite ou delete seus planejamentos salvos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando planejamentos...
            </div>
          ) : planejamentos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum planejamento salvo ainda
              </p>
              <Button
                onClick={() => router.push('/dashboard/planejamento-silagem')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Planejamento
              </Button>
            </div>
          ) : (
            <TabelaHistorico
              planejamentos={planejamentos}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DialogDetalhes
        planejamento={planejamentoSelecionado}
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
      />

      <DialogExcluir
        open={excluirOpen}
        onOpenChange={setExcluirOpen}
        nome={planejamentoParaExcluir?.nome || ''}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeletando}
      />

      <DialogEditarNome
        open={editarOpen}
        onOpenChange={setEditarOpen}
        nomeAtual={planejamentoParaEditar?.nome || ''}
        onConfirm={handleConfirmEdit}
        isUpdating={isEditando}
      />
    </div>
  );
}
