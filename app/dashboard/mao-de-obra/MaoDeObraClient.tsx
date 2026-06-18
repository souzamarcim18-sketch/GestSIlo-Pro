'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'rgba(115,141,69,0.15)', border: '1px solid rgba(115,141,69,0.3)' }}
          >
            <Users className="h-5 w-5" style={{ color: '#738D45' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mão de Obra</h1>
            <p className="text-sm text-muted-foreground">
              {initialColaboradores.filter((c) => c.ativo).length} colaborador
              {initialColaboradores.filter((c) => c.ativo).length !== 1 ? 'es' : ''} ativo
              {initialColaboradores.filter((c) => c.ativo).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {aba === 'colaboradores' ? (
              <Button
                onClick={() => setModalColaborador(true)}
                className="gap-2 font-semibold"
                style={{ background: '#738D45', color: '#fff' }}
              >
                <Plus className="h-4 w-4" />
                Novo Colaborador
              </Button>
            ) : (
              <Button
                onClick={() => setModalAtividade(true)}
                className="gap-2 font-semibold"
                style={{ background: '#738D45', color: '#fff' }}
              >
                <Plus className="h-4 w-4" />
                Registrar Atividade
              </Button>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <KpisSection kpis={initialKpis} />

      {/* Abas */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content' }}
      >
        <button
          onClick={() => setAba('atividades')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
            aba === 'atividades'
              ? 'text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={
            aba === 'atividades'
              ? { background: '#738D45' }
              : undefined
          }
        >
          <ClipboardList className="h-4 w-4" />
          Atividades
        </button>
        <button
          onClick={() => setAba('colaboradores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
            aba === 'colaboradores'
              ? 'text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={
            aba === 'colaboradores'
              ? { background: '#738D45' }
              : undefined
          }
        >
          <Users className="h-4 w-4" />
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
