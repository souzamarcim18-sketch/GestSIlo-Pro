'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PiqueteCard } from '../components/PiqueteCard';
import { PiqueteForm } from '../components/PiqueteForm';
import { HistoricoOcupacoes } from '../components/HistoricoOcupacoes';
import { EventosManejoList } from '../components/EventosManejoList';
import type { PastagemComResumo, OcupacaoPiqueteComLote, EventoManejoComJoins } from '@/lib/types/pastagens';

const SISTEMA_LABEL: Record<string, string> = {
  rotacionado: 'Rotacionado',
  continuo: 'Contínuo',
  semi_intensivo: 'Semi-intensivo',
};

interface PastagemDetailClientProps {
  pastagem: PastagemComResumo;
  ocupacoesPorPiquete: Record<string, OcupacaoPiqueteComLote[]>;
  eventosPorPiquete: Record<string, EventoManejoComJoins[]>;
  isAdmin: boolean;
}

export function PastagemDetailClient({
  pastagem,
  ocupacoesPorPiquete,
  eventosPorPiquete,
  isAdmin,
}: PastagemDetailClientProps) {
  const router = useRouter();
  const [novoPiqueteOpen, setNovoPiqueteOpen] = useState(false);
  const [piqueteSelecionado, setPiqueteSelecionado] = useState<string>(
    pastagem.piquetes[0]?.id ?? ''
  );

  const piquete = pastagem.piquetes.find((p) => p.id === piqueteSelecionado);
  const ocupacoes = piqueteSelecionado ? (ocupacoesPorPiquete[piqueteSelecionado] ?? []) : [];
  const eventos = piqueteSelecionado ? (eventosPorPiquete[piqueteSelecionado] ?? []) : [];

  function handleMutate() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + cabeçalho */}
      <div>
        <Link
          href="/dashboard/pastagens"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" />
          Pastagens
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(0,196,90,0.12)', border: '1px solid rgba(0,196,90,0.2)' }}
            >
              <Leaf className="h-5 w-5 text-[#00c45a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{pastagem.nome}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {pastagem.especie_forrageira && <span>{pastagem.especie_forrageira}</span>}
                <span>{SISTEMA_LABEL[pastagem.sistema_pastejo] ?? pastagem.sistema_pastejo}</span>
                <span>{pastagem.area_total_ha.toLocaleString('pt-BR')} ha</span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setNovoPiqueteOpen(true)}
              className="gap-2 bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
            >
              <Plus className="h-4 w-4" />
              Novo Piquete
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-2xl font-bold text-foreground">{pastagem.total_piquetes}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-2xl font-bold text-[#00c45a]">{pastagem.em_pastejo}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Em pastejo</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-2xl font-bold text-blue-400">{pastagem.em_descanso}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Descanso</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-2xl font-bold text-orange-400">{pastagem.em_reforma + pastagem.interditados}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Reforma/Interdit.</div>
        </div>
      </div>

      {pastagem.piquetes.length === 0 ? (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center text-center"
          style={{ background: '#1c1c1c', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Nenhum piquete cadastrado</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Cadastre os piquetes desta pastagem para começar o monitoramento.
          </p>
          {isAdmin && (
            <Button
              onClick={() => setNovoPiqueteOpen(true)}
              className="gap-2 bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
            >
              <Plus className="h-4 w-4" />
              Novo Piquete
            </Button>
          )}
        </div>
      ) : (
        <Tabs defaultValue="piquetes">
          <TabsList className="inline-flex flex-wrap w-auto bg-[#222] border border-white/8 h-auto p-1">
            <TabsTrigger
              value="piquetes"
              className="text-sm py-1.5 data-[state=active]:text-[#00c45a] data-[state=active]:bg-[#00c45a]/10"
            >
              Piquetes ({pastagem.total_piquetes})
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="text-sm py-1.5 data-[state=active]:text-[#00c45a] data-[state=active]:bg-[#00c45a]/10"
            >
              Histórico
            </TabsTrigger>
            <TabsTrigger
              value="eventos"
              className="text-sm py-1.5 data-[state=active]:text-[#00c45a] data-[state=active]:bg-[#00c45a]/10"
            >
              Eventos de manejo
            </TabsTrigger>
          </TabsList>

          {/* Aba piquetes */}
          <TabsContent value="piquetes" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pastagem.piquetes.map((pq) => (
                <PiqueteCard
                  key={pq.id}
                  piquete={pq}
                  pastagemId={pastagem.id}
                  isAdmin={isAdmin}
                  onMutate={handleMutate}
                />
              ))}
            </div>
          </TabsContent>

          {/* Aba histórico */}
          <TabsContent value="historico" className="mt-4">
            <div
              className="rounded-xl p-4"
              style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {pastagem.piquetes.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1 block">Filtrar por piquete</label>
                  <div className="flex flex-wrap gap-2">
                    {pastagem.piquetes.map((pq) => (
                      <button
                        key={pq.id}
                        onClick={() => setPiqueteSelecionado(pq.id)}
                        className={`text-xs px-3 py-1 rounded-full transition-all ${
                          piqueteSelecionado === pq.id
                            ? 'bg-[#00c45a]/20 text-[#00c45a] border border-[#00c45a]/30'
                            : 'bg-white/5 text-muted-foreground border border-white/8 hover:border-white/15'
                        }`}
                      >
                        {pq.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <HistoricoOcupacoes ocupacoes={ocupacoes} />
            </div>
          </TabsContent>

          {/* Aba eventos de manejo */}
          <TabsContent value="eventos" className="mt-4">
            <div
              className="rounded-xl p-4"
              style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {pastagem.piquetes.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1 block">Filtrar por piquete</label>
                  <div className="flex flex-wrap gap-2">
                    {pastagem.piquetes.map((pq) => (
                      <button
                        key={pq.id}
                        onClick={() => setPiqueteSelecionado(pq.id)}
                        className={`text-xs px-3 py-1 rounded-full transition-all ${
                          piqueteSelecionado === pq.id
                            ? 'bg-[#00c45a]/20 text-[#00c45a] border border-[#00c45a]/30'
                            : 'bg-white/5 text-muted-foreground border border-white/8 hover:border-white/15'
                        }`}
                      >
                        {pq.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {piquete && (
                <EventosManejoList
                  piqueteId={piquete.id}
                  initialEventos={eventos}
                  isAdmin={isAdmin}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Modal novo piquete */}
      <Dialog open={novoPiqueteOpen} onOpenChange={setNovoPiqueteOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo piquete — {pastagem.nome}</DialogTitle>
          </DialogHeader>
          <PiqueteForm
            pastagemId={pastagem.id}
            especie={pastagem.especie_forrageira}
            onSuccess={() => {
              setNovoPiqueteOpen(false);
              handleMutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
