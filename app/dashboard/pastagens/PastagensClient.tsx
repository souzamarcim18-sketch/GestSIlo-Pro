'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Leaf, AlertTriangle, Fence, Trees, Moon, Hammer, Ban, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
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

  const totalPastagens = initialPastagens.length;
  const totalPiquetes = initialPastagens.reduce((acc, p) => acc + p.total_piquetes, 0);
  const emPastejo = initialPastagens.reduce((acc, p) => acc + p.em_pastejo, 0);
  const emDescanso = initialPastagens.reduce((acc, p) => acc + p.em_descanso, 0);
  const emReforma = initialPastagens.reduce((acc, p) => acc + p.em_reforma, 0);
  const interditados = initialPastagens.reduce((acc, p) => acc + p.interditados, 0);

  const todosPiquetes = initialPastagens.flatMap((p) => p.piquetes);
  const alertasSuperlotacao = todosPiquetes.filter((pq) => pq.alerta_superlotacao).length;
  const alertasProntos = todosPiquetes.filter((pq) => pq.alerta_pronto_entrada).length;
  const alertasVencidos = todosPiquetes.filter((pq) => pq.alerta_ocupacao_vencida).length;
  const necessitamReforma =
    initialPastagens.filter((p) => p.necessita_reforma).length +
    todosPiquetes.filter((pq) => pq.necessita_reforma).length;

  const totalAlertas = alertasSuperlotacao + alertasProntos + alertasVencidos;

  // Primeira pastagem com algum alerta — alvo da âncora da faixa de alertas
  const primeiraPastagemComAlerta = initialPastagens.find((p) =>
    p.piquetes.some((pq) => pq.alerta_superlotacao || pq.alerta_pronto_entrada || pq.alerta_ocupacao_vencida)
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
      <PageHeader icon={Leaf} titulo="Gestão de Pastagens">
        {isAdmin && (
          <Button onClick={() => setModalAberto(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Pastagem
          </Button>
        )}
      </PageHeader>

      {/* KPIs resumidos */}
      {initialPastagens.length > 0 && (
        <div className="space-y-3">
          {/* Linha 1 — inventário */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Pastagens" valor={totalPastagens} sublabel="total cadastradas" icon={<Leaf className="h-5 w-5" />} />
            <KpiCard label="Piquetes" valor={totalPiquetes} sublabel="total cadastrados" icon={<Fence className="h-5 w-5" />} />
            <KpiCard label="Em Pastejo" valor={emPastejo} sublabel="piquetes ocupados" icon={<Trees className="h-5 w-5" />} />
            <KpiCard label="Em Descanso" valor={emDescanso} sublabel="piquetes descansando" icon={<Moon className="h-5 w-5" />} />
          </div>

          {/* Linha 2 — situação / atenção */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Em Reforma" valor={emReforma} sublabel="piquetes em reforma" icon={<Hammer className="h-5 w-5" />} />
            <KpiCard label="Interditados" valor={interditados} sublabel="piquetes interditados" icon={<Ban className="h-5 w-5" />} />
            <KpiCard label="Necessitam Reforma" valor={necessitamReforma} sublabel="sinalizados p/ reforma" icon={<Wrench className="h-5 w-5" />} />
            <KpiCard label="Alertas" valor={totalAlertas} sublabel="requerem atenção" icon={<AlertTriangle className="h-5 w-5" />} />
          </div>
        </div>
      )}

      {/* Faixa de alertas — clicável: rola até os piquetes afetados */}
      {totalAlertas > 0 && (
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
            {alertasVencidos > 0 && (
              <div>
                <strong>{alertasVencidos}</strong> piquete{alertasVencidos !== 1 ? 's' : ''} com saída de lote atrasada
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
