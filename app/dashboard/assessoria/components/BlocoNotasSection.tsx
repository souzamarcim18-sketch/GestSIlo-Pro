'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnotacaoAssessoria } from '@/lib/types/assessoria';
import { deletarAnotacaoAction, marcarAnotacaoResolvidaAction } from '@/app/dashboard/assessoria/actions';
import AnotacaoForm from './AnotacaoForm';
import AnotacoesFilters from './AnotacoesFilters';
import AnotacoesList from './AnotacoesList';
import DeleteAnotacaoDialog from './DeleteAnotacaoDialog';

interface BlocoNotasSectionProps {
  anotacoes: AnotacaoAssessoria[];
  onRefresh: () => Promise<void>;
}

export default function BlocoNotasSection({ anotacoes, onRefresh }: BlocoNotasSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAnotacao, setSelectedAnotacao] = useState<AnotacaoAssessoria | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedPrioridade, setSelectedPrioridade] = useState('');
  const [selectedResolvida, setSelectedResolvida] = useState('');

  const filteredAnotacoes = useMemo(() => {
    return anotacoes.filter((nota) => {
      const searchMatch =
        nota.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
        nota.conteudo.toLowerCase().includes(searchText.toLowerCase());

      const categoriaMatch = !selectedCategoria || nota.categoria === selectedCategoria;
      const prioridadeMatch = !selectedPrioridade || nota.prioridade === selectedPrioridade;

      let resolvidaMatch = true;
      if (selectedResolvida === 'pendentes') resolvidaMatch = !nota.resolvida;
      if (selectedResolvida === 'resolvidas') resolvidaMatch = nota.resolvida;

      return searchMatch && categoriaMatch && prioridadeMatch && resolvidaMatch;
    });
  }, [anotacoes, searchText, selectedCategoria, selectedPrioridade, selectedResolvida]);

  const handleEdit = (anotacao: AnotacaoAssessoria) => {
    setSelectedAnotacao(anotacao);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedAnotacao(undefined);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const result = await deletarAnotacaoAction(deleteId);
      if (result.success) {
        toast.success('Anotação deletada com sucesso');
        await onRefresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleMarcarResolvida = async (id: string, resolvida: boolean) => {
    try {
      const result = await marcarAnotacaoResolvidaAction(id, {
        resolvida,
      });
      if (result.success) {
        toast.success(resolvida ? 'Marcada como resolvida' : 'Marcada como pendente');
        await onRefresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao atualizar anotação');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bloco de Notas</CardTitle>
            <CardDescription>
              Registre dúvidas, observações de campo e sugestões agronômicas
            </CardDescription>
          </div>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Anotação
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <AnotacoesFilters
            onSearchChange={setSearchText}
            onCategoriaChange={(v) => setSelectedCategoria(v || '')}
            onPrioridadeChange={(v) => setSelectedPrioridade(v || '')}
            onResolvidaChange={(v) => setSelectedResolvida(v || '')}
          />

          <AnotacoesList
            anotacoes={filteredAnotacoes}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteId(id)}
            onMarcarResolvida={handleMarcarResolvida}
          />
        </CardContent>
      </Card>

      <AnotacaoForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAnotacao(undefined);
        }}
        anotacao={selectedAnotacao}
        onAfterSubmit={onRefresh}
      />

      <DeleteAnotacaoDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
