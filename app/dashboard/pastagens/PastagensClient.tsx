'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Leaf, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PastagemCard } from './components/PastagemCard';
import { PastagemForm } from './components/PastagemForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PastagemComResumo } from '@/lib/types/pastagens';

interface PastagensClientProps {
  initialPastagens: PastagemComResumo[];
  isAdmin: boolean;
}

export function PastagensClient({ initialPastagens, isAdmin }: PastagensClientProps) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);

  const totalPiquetes = initialPastagens.reduce((acc, p) => acc + p.total_piquetes, 0);
  const emPastejo = initialPastagens.reduce((acc, p) => acc + p.em_pastejo, 0);
  const emDescanso = initialPastagens.reduce((acc, p) => acc + p.em_descanso, 0);
  const alertasSuperlotacao = initialPastagens
    .flatMap((p) => p.piquetes)
    .filter((pq) => pq.alerta_superlotacao).length;
  const alertasProntos = initialPastagens
    .flatMap((p) => p.piquetes)
    .filter((pq) => pq.alerta_pronto_entrada).length;

  function handleSuccess() {
    setModalAberto(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'rgba(0,196,90,0.12)', border: '1px solid rgba(0,196,90,0.2)' }}
          >
            <Leaf className="h-5 w-5 text-[#00c45a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pastagens</h1>
            <p className="text-sm text-muted-foreground">
              {initialPastagens.length} pastagen{initialPastagens.length !== 1 ? 's' : ''} cadastrada{initialPastagens.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setModalAberto(true)}
            className="gap-2 bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nova Pastagem
          </Button>
        )}
      </div>

      {/* KPIs resumidos */}
      {initialPastagens.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className="rounded-lg p-4"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Piquetes</div>
            <div className="text-3xl font-bold text-foreground">{totalPiquetes}</div>
            <div className="text-xs text-muted-foreground mt-1">total cadastrados</div>
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Em Pastejo</div>
            <div className="text-3xl font-bold text-[#00c45a]">{emPastejo}</div>
            <div className="text-xs text-muted-foreground mt-1">piquetes ocupados</div>
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Em Descanso</div>
            <div className="text-3xl font-bold text-blue-400">{emDescanso}</div>
            <div className="text-xs text-muted-foreground mt-1">piquetes descansando</div>
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Alertas</div>
            <div className="text-3xl font-bold text-[#f5d000]">{alertasSuperlotacao + alertasProntos}</div>
            <div className="text-xs text-muted-foreground mt-1">requerem atenção</div>
          </div>
        </div>
      )}

      {/* Faixa de alertas */}
      {(alertasSuperlotacao > 0 || alertasProntos > 0) && (
        <div
          className="rounded-lg p-3 flex items-start gap-3"
          style={{ background: 'rgba(245,208,0,0.08)', border: '1px solid rgba(245,208,0,0.2)' }}
        >
          <AlertTriangle className="h-4 w-4 text-[#f5d000] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#f5d000] space-y-0.5">
            {alertasSuperlotacao > 0 && (
              <div>
                <strong>{alertasSuperlotacao}</strong> piquete{alertasSuperlotacao !== 1 ? 's' : ''} com superlotação
              </div>
            )}
            {alertasProntos > 0 && (
              <div>
                <strong>{alertasProntos}</strong> piquete{alertasProntos !== 1 ? 's' : ''} pronto{alertasProntos !== 1 ? 's' : ''} para entrada de lote
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid de pastagens */}
      {initialPastagens.length === 0 ? (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center text-center"
          style={{ background: '#1c1c1c', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          <Leaf className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Nenhuma pastagem cadastrada</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Cadastre sua primeira pastagem para começar a monitorar os piquetes.
          </p>
          {isAdmin && (
            <Button
              onClick={() => setModalAberto(true)}
              className="gap-2 bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
            >
              <Plus className="h-4 w-4" />
              Nova Pastagem
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {initialPastagens.map((pastagem) => (
            <PastagemCard
              key={pastagem.id}
              pastagem={pastagem}
              isAdmin={isAdmin}
              onMutate={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Modal criar pastagem */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Pastagem</DialogTitle>
          </DialogHeader>
          <PastagemForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
