'use client';

import { useState } from 'react';
import { Edit, Trash2, LogIn, LogOut, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PiqueteForm } from './PiqueteForm';
import { DeletePiqueteDialog } from './DeletePiqueteDialog';
import { OcupacaoForm } from './OcupacaoForm';
import { FecharOcupacaoDialog } from './FecharOcupacaoDialog';
import { EventoManejoForm } from './EventoManejoForm';
import type { PiqueteComOcupacaoAtual } from '@/lib/types/pastagens';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  'Em pastejo': {
    label: 'Em pastejo',
    color: '#00c45a',
    bg: 'rgba(0,196,90,0.1)',
    border: 'rgba(0,196,90,0.25)',
  },
  'Descanso': {
    label: 'Descanso',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.25)',
  },
  'Em reforma': {
    label: 'Em reforma',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.1)',
    border: 'rgba(251,146,60,0.25)',
  },
  'Interditado': {
    label: 'Interditado',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.25)',
  },
};

interface PiqueteCardProps {
  piquete: PiqueteComOcupacaoAtual;
  pastagemId: string;
  isAdmin: boolean;
  onMutate: () => void;
}

export function PiqueteCard({ piquete, pastagemId, isAdmin, onMutate }: PiqueteCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ocupacaoOpen, setOcupacaoOpen] = useState(false);
  const [fecharOcupacaoOpen, setFecharOcupacaoOpen] = useState(false);
  const [eventoOpen, setEventoOpen] = useState(false);

  const statusCfg = STATUS_CONFIG[piquete.status] ?? STATUS_CONFIG['Descanso'];
  const ocupacao = piquete.ocupacao_atual;

  const uaAtual = ocupacao?.ua_real ?? null;
  const uaSuportada = piquete.ua_suportada;
  const uaPct = uaAtual !== null && uaSuportada !== null && uaSuportada > 0
    ? Math.min(Math.round((uaAtual / uaSuportada) * 100), 150)
    : null;

  function handleSuccess() {
    setEditOpen(false);
    setDeleteOpen(false);
    setOcupacaoOpen(false);
    setFecharOcupacaoOpen(false);
    setEventoOpen(false);
    onMutate();
  }

  return (
    <>
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{
          background: '#222',
          border: `1px solid ${
            piquete.alerta_superlotacao
              ? 'rgba(248,113,113,0.3)'
              : piquete.alerta_pronto_entrada
              ? 'rgba(245,208,0,0.3)'
              : 'rgba(255,255,255,0.08)'
          }`,
        }}
      >
        {/* Cabeçalho: nome + status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{piquete.nome}</h4>
            <div className="text-xs text-muted-foreground mt-0.5">{piquete.area_ha.toLocaleString('pt-BR')} ha</div>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              color: statusCfg.color,
              background: statusCfg.bg,
              border: `1px solid ${statusCfg.border}`,
            }}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* UA/ha */}
        {uaAtual !== null && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">UA/ha</span>
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold ${piquete.alerta_superlotacao ? 'text-red-400' : 'text-foreground'}`}>
                  {uaAtual.toFixed(1)}
                </span>
                {uaSuportada !== null && (
                  <span className="text-muted-foreground">/ {uaSuportada.toFixed(1)}</span>
                )}
                {ocupacao?.metodo_calculo_ua && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 cursor-default ${
                          ocupacao.metodo_calculo_ua === 'peso_real'
                            ? 'border-green-500/30 text-green-400 bg-green-500/10'
                            : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                        }`}
                      >
                        {ocupacao.metodo_calculo_ua === 'peso_real' ? 'Peso real' : 'Estimativa'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {ocupacao.metodo_calculo_ua === 'peso_real'
                        ? 'Calculado com base em pesagens dos últimos 90 dias'
                        : 'Um ou mais animais sem pesagem recente — usando fator fixo por categoria'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            {uaPct !== null && (
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(uaPct, 100)}%`,
                    background: piquete.alerta_superlotacao ? '#f87171' : '#00c45a',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Lote em pastejo */}
        {ocupacao && (
          <div className="text-xs text-muted-foreground">
            Lote: <span className="text-foreground font-medium">{ocupacao.lotes?.nome ?? '—'}</span>
            {ocupacao.quantidade_animais !== null && (
              <span className="ml-2">· {ocupacao.quantidade_animais} animais</span>
            )}
          </div>
        )}

        {/* Descanso acumulado */}
        {piquete.status === 'Descanso' && piquete.dias_descanso_acumulado !== null && (
          <div className={`text-xs ${piquete.alerta_pronto_entrada ? 'text-[#f5d000]' : 'text-muted-foreground'}`}>
            {piquete.dias_descanso_acumulado} dias de descanso
            {piquete.dias_descanso_ideal !== null && (
              <span> (ideal: {piquete.dias_descanso_ideal} dias)</span>
            )}
            {piquete.alerta_pronto_entrada && ' — Pronto para entrada!'}
          </div>
        )}

        {/* Alertas */}
        {piquete.alerta_superlotacao && (
          <div className="text-xs text-red-400 font-medium">
            ⚠ Superlotação detectada
          </div>
        )}

        {/* Ações Admin */}
        {isAdmin && (
          <div className="pt-2 border-t border-white/8 space-y-1.5">
            {/* Ação principal contextual + Evento */}
            <div className="flex gap-1.5">
              {piquete.status === 'Descanso' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOcupacaoOpen(true)}
                  className="flex-1 h-7 text-xs border-[#00c45a]/30 text-[#00c45a] hover:bg-[#00c45a]/10 hover:border-[#00c45a]/50 gap-1"
                >
                  <LogIn className="h-3 w-3" />
                  Entrada
                </Button>
              )}
              {piquete.status === 'Em pastejo' && ocupacao && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFecharOcupacaoOpen(true)}
                  className="flex-1 h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Fechar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEventoOpen(true)}
                className="flex-1 h-7 text-xs border-white/15 text-muted-foreground hover:text-foreground hover:bg-white/8 hover:border-white/25 gap-1"
              >
                <Wrench className="h-3 w-3" />
                Evento
              </Button>
            </div>
            {/* Editar / Excluir */}
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="flex-1 h-7 text-xs border-white/15 text-muted-foreground hover:text-foreground hover:bg-white/8 hover:border-white/25 gap-1"
              >
                <Edit className="h-3 w-3" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="flex-1 h-7 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/35 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Excluir
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar piquete</DialogTitle>
          </DialogHeader>
          <PiqueteForm pastagemId={pastagemId} piquete={piquete} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      <DeletePiqueteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        piqueteId={piquete.id}
        piqueteNome={piquete.nome}
        onSuccess={handleSuccess}
      />

      <Dialog open={ocupacaoOpen} onOpenChange={setOcupacaoOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar entrada de lote — {piquete.nome}</DialogTitle>
          </DialogHeader>
          <OcupacaoForm piqueteId={piquete.id} areaHa={piquete.area_ha} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      {ocupacao && (
        <FecharOcupacaoDialog
          open={fecharOcupacaoOpen}
          onOpenChange={setFecharOcupacaoOpen}
          ocupacao={ocupacao}
          onSuccess={handleSuccess}
        />
      )}

      <Dialog open={eventoOpen} onOpenChange={setEventoOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar evento de manejo — {piquete.nome}</DialogTitle>
          </DialogHeader>
          <EventoManejoForm piqueteId={piquete.id} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
