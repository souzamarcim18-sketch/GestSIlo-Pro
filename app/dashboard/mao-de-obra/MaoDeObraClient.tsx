'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpisSection } from './components/KpisSection';
import { ColaboradoresList } from './components/ColaboradoresList';
import { FolhaMensalCLT } from './components/FolhaMensalCLT';
import { ColaboradorForm } from './components/ColaboradorForm';
import { AtividadesList } from './components/AtividadesList';
import { AtividadeForm } from './components/AtividadeForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AtividadeComColaboradores, Colaborador, KpisMaoObra } from '@/lib/types/mao-de-obra';

interface MaoDeObraClientProps {
  initialColaboradores: Colaborador[];
  initialAtividades: AtividadeComColaboradores[];
  initialKpis: KpisMaoObra;
  talhoes: Array<{ id: string; nome: string }>;
  silos: Array<{ id: string; nome: string }>;
  maquinas: Array<{ id: string; nome: string }>;
  isAdmin: boolean;
}

type Aba = 'atividades' | 'colaboradores';

export function MaoDeObraClient({
  initialColaboradores,
  initialAtividades,
  initialKpis,
  talhoes,
  silos,
  maquinas,
  isAdmin,
}: MaoDeObraClientProps) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>('atividades');
  const [modalColaborador, setModalColaborador] = useState(false);
  const [modalAtividade, setModalAtividade] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | null>(null);
  const [atividadeEditando, setAtividadeEditando] = useState<AtividadeComColaboradores | null>(null);

  function handleSuccess() {
    setModalColaborador(false);
    setModalAtividade(false);
    setColaboradorEditando(null);
    setAtividadeEditando(null);
    router.refresh();
  }

  function handleEditColaborador(c: Colaborador) {
    setColaboradorEditando(c);
    setModalColaborador(true);
  }

  function handleEditAtividade(a: AtividadeComColaboradores) {
    setAtividadeEditando(a);
    setModalAtividade(true);
  }

  function handleCloseColaborador() {
    setModalColaborador(false);
    setColaboradorEditando(null);
  }

  function handleCloseAtividade() {
    setModalAtividade(false);
    setAtividadeEditando(null);
  }

  const colaboradoresAtivos = initialColaboradores.filter((c) => c.ativo);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <PageHeader icon={Users} titulo="Gestão de Equipe">
          {isAdmin && (
            aba === 'colaboradores' ? (
              <Button onClick={() => setModalColaborador(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            ) : (
              <Button onClick={() => setModalAtividade(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Atividade
              </Button>
            )
          )}
        </PageHeader>
        <p className="text-sm text-muted-foreground">
          {initialColaboradores.filter((c) => c.ativo).length} colaborador
          {initialColaboradores.filter((c) => c.ativo).length !== 1 ? 'es' : ''} ativo
          {initialColaboradores.filter((c) => c.ativo).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPIs */}
      <KpisSection kpis={initialKpis} />

      {/* Abas */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setAba('atividades')}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
            aba === 'atividades'
              ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
              : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-accent/50 hover:border-primary/30'
          }`}
        >
          Atividades
        </button>
        <button
          onClick={() => setAba('colaboradores')}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
            aba === 'colaboradores'
              ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
              : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-accent/50 hover:border-primary/30'
          }`}
        >
          Colaboradores
        </button>
      </div>

      {/* Conteúdo por aba */}
      {aba === 'atividades' && (
        <AtividadesList
          atividades={initialAtividades}
          colaboradores={initialColaboradores}
          isAdmin={isAdmin}
          onEdit={handleEditAtividade}
          onRefresh={() => router.refresh()}
        />
      )}
      {aba === 'colaboradores' && (
        <div className="space-y-6">
          <FolhaMensalCLT isAdmin={isAdmin} onRefresh={() => router.refresh()} />
          <ColaboradoresList
            colaboradores={initialColaboradores}
            isAdmin={isAdmin}
            onEdit={handleEditColaborador}
            onRefresh={() => router.refresh()}
          />
        </div>
      )}

      {/* Modal Colaborador */}
      <Dialog open={modalColaborador} onOpenChange={(open) => { if (!open) handleCloseColaborador(); }}>
        <DialogContent className="max-w-lg" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {colaboradorEditando ? 'Editar Colaborador' : 'Novo Colaborador'}
            </DialogTitle>
          </DialogHeader>
          <ColaboradorForm
            colaborador={colaboradorEditando ?? undefined}
            onSuccess={handleSuccess}
            onCancel={handleCloseColaborador}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Atividade */}
      <Dialog open={modalAtividade} onOpenChange={(open) => { if (!open) handleCloseAtividade(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {atividadeEditando ? 'Editar Atividade' : 'Registrar Atividade'}
            </DialogTitle>
          </DialogHeader>
          <AtividadeForm
            colaboradores={colaboradoresAtivos}
            talhoes={talhoes}
            silos={silos}
            maquinas={maquinas}
            atividade={atividadeEditando ?? undefined}
            onSuccess={handleSuccess}
            onCancel={handleCloseAtividade}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
