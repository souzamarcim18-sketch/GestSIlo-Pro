'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EventoManejoForm } from './EventoManejoForm';
import { deletarEventoManejoAction } from '../actions';
import type { EventoManejoComJoins, TipoEventoManejo } from '@/lib/types/pastagens';

const TIPO_LABEL: Record<TipoEventoManejo, string> = {
  adubacao_manutencao: 'Adubação de manutenção',
  calagem:             'Calagem',
  reforma:             'Reforma',
  ressemeadura:        'Ressemeadura',
  irrigacao:           'Irrigação',
  interdicao:          'Interdição',
  rocagem:             'Roçagem',
  manutencao_cerca:    'Manutenção de cerca',
  outro:               'Outro',
};

const SERVICO_CERCA_LABEL: Record<string, string> = {
  reparo:       'Reparo',
  substituicao: 'Substituição',
  nova:         'Nova cerca',
};

const TIPOS_ALTERA_STATUS: TipoEventoManejo[] = ['reforma', 'interdicao'];

interface EventosManejoListProps {
  piqueteId: string;
  initialEventos: EventoManejoComJoins[];
  isAdmin: boolean;
}

export function EventosManejoList({ piqueteId, initialEventos, isAdmin }: EventosManejoListProps) {
  const router = useRouter();
  const [novoOpen, setNovoOpen] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoTipo, setDeletandoTipo] = useState<TipoEventoManejo | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!deletandoId) return;
    setLoading(true);
    const result = await deletarEventoManejoAction(deletandoId);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Evento excluído. O status do piquete não foi alterado automaticamente.');
    setDeletandoId(null);
    setDeletandoTipo(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Eventos de manejo</h4>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNovoOpen(true)}
            className="h-7 px-3 text-xs border-white/10 hover:bg-white/5 gap-1"
          >
            <Plus className="h-3 w-3" />
            Registrar evento
          </Button>
        )}
      </div>

      {initialEventos.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Nenhum evento de manejo registrado.
        </div>
      ) : (
        <div className="space-y-2">
          {initialEventos.map((evt) => (
            <div
              key={evt.id}
              className="rounded-lg p-3 flex items-start justify-between gap-3"
              style={{ background: '#222', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {TIPO_LABEL[evt.tipo] ?? evt.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(evt.data).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                  {evt.insumos && (
                    <div>
                      Insumo: {evt.insumos.nome}
                      {evt.quantidade_insumo !== null && ` · ${evt.quantidade_insumo} ${evt.unidade_insumo ?? evt.insumos.unidade}`}
                      {evt.dose_por_ha !== null && ` · ${evt.dose_por_ha}/ha`}
                    </div>
                  )}
                  {evt.tipo === 'manutencao_cerca' && (evt.tipo_servico_cerca || evt.metragem_cerca_m !== null || evt.material_cerca) && (
                    <div>
                      Cerca:
                      {evt.tipo_servico_cerca && ` ${SERVICO_CERCA_LABEL[evt.tipo_servico_cerca] ?? evt.tipo_servico_cerca}`}
                      {evt.metragem_cerca_m !== null && ` · ${evt.metragem_cerca_m} m`}
                      {evt.material_cerca && ` · ${evt.material_cerca}`}
                    </div>
                  )}
                  {evt.maquinas && <div>Máquina: {evt.maquinas.nome}</div>}
                  {evt.custo_estimado !== null && (
                    <div>
                      Custo: R$ {evt.custo_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  {evt.observacoes && <div className="italic">{evt.observacoes}</div>}
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeletandoId(evt.id);
                    setDeletandoTipo(evt.tipo as TipoEventoManejo);
                  }}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/5 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal novo evento */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar evento de manejo</DialogTitle>
          </DialogHeader>
          <EventoManejoForm
            piqueteId={piqueteId}
            onSuccess={() => {
              setNovoOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={!!deletandoId} onOpenChange={(open) => { if (!open) { setDeletandoId(null); setDeletandoTipo(null); } }}>
        <DialogContent
          className="max-w-md"
          style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-4 w-4" />
              Excluir evento de manejo
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Confirma a exclusão deste evento?
            </DialogDescription>
          </DialogHeader>

          {deletandoTipo && TIPOS_ALTERA_STATUS.includes(deletandoTipo) && (
            <div
              className="rounded-lg p-3 flex items-start gap-2"
              style={{ background: 'rgba(245,208,0,0.08)', border: '1px solid rgba(245,208,0,0.2)' }}
            >
              <AlertTriangle className="h-4 w-4 text-[#f5d000] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#f5d000]">
                O status do piquete não será alterado automaticamente. Ajuste manualmente se necessário.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => { setDeletandoId(null); setDeletandoTipo(null); }}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {loading ? 'Excluindo...' : 'Excluir evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
