'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Leaf, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  // Primeira pastagem com algum alerta — alvo da âncora da faixa de alertas
  const primeiraPastagemComAlerta = initialPastagens.find((p) =>
    p.piquetes.some((pq) => pq.alerta_superlotacao || pq.alerta_pronto_entrada)
  );

  function handleSuccess() {
    setModalAberto(false);
    router.refresh();
  }

  function scrollToAlertas() {
    if (!primeiraPastagemComAlerta) return;
    const el = document.getElementById(`pastagem-${primeiraPastagemComAlerta.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pastagens</h1>
            <p className="text-sm text-muted-foreground">
              {initialPastagens.length} pastagen{initialPastagens.length !== 1 ? 's' : ''} cadastrada{initialPastagens.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalAberto(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Pastagem
          </Button>
        )}
      </div>

      {/* KPIs resumidos */}
      {initialPastagens.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Piquetes</div>
              <div className="text-3xl font-bold text-foreground">{totalPiquetes}</div>
              <div className="text-xs text-muted-foreground mt-1">total cadastrados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Em Pastejo</div>
              <div className="text-3xl font-bold text-green-400">{emPastejo}</div>
              <div className="text-xs text-muted-foreground mt-1">piquetes ocupados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Em Descanso</div>
              <div className="text-3xl font-bold text-blue-400">{emDescanso}</div>
              <div className="text-xs text-muted-foreground mt-1">piquetes descansando</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Alertas</div>
              <div className="text-3xl font-bold text-yellow-400">{alertasSuperlotacao + alertasProntos}</div>
              <div className="text-xs text-muted-foreground mt-1">requerem atenção</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Faixa de alertas — clicável: rola até os piquetes afetados */}
      {(alertasSuperlotacao > 0 || alertasProntos > 0) && (
        <button
          type="button"
          onClick={scrollToAlertas}
          className="w-full text-left rounded-lg p-3 flex items-start gap-3 bg-yellow-500/[0.08] border border-yellow-500/20 hover:bg-yellow-500/[0.12] transition-colors cursor-pointer"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-400 space-y-0.5">
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
            <div className="text-xs text-yellow-400/70 mt-0.5">Toque para ver as pastagens afetadas →</div>
          </div>
        </button>
      )}

      {/* Grid de pastagens */}
      {initialPastagens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <Leaf className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Nenhuma pastagem cadastrada</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Cadastre sua primeira pastagem para começar a monitorar os piquetes.
            </p>
            {isAdmin && (
              <Button onClick={() => setModalAberto(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Pastagem
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {initialPastagens.map((pastagem) => (
            <div key={pastagem.id} id={`pastagem-${pastagem.id}`} className="scroll-mt-4">
              <PastagemCard
                pastagem={pastagem}
                isAdmin={isAdmin}
                onMutate={() => router.refresh()}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal criar pastagem */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Pastagem</DialogTitle>
          </DialogHeader>
          <PastagemForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
