'use client';

import { useEffect, useState } from 'react';
import {
  Baby,
  Scale,
  AlertCircle,
  ShoppingCart,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { EventoRebanho, Lote } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';
import { listEventosPorAnimal, getLoteById } from '@/lib/supabase/rebanho';
import { Card } from '@/components/ui/card';

interface HistoricoEventosProps {
  animal_id: string;
}

const iconMap = {
  [TipoEvento.NASCIMENTO]: Baby,
  [TipoEvento.PESAGEM]: Scale,
  [TipoEvento.MORTE]: AlertCircle,
  [TipoEvento.VENDA]: ShoppingCart,
  [TipoEvento.TRANSFERENCIA_LOTE]: ArrowRight,
} as const;

function formatarData(dataIso: string): string {
  const data = new Date(dataIso);
  const opcoes: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return data.toLocaleDateString('pt-BR', opcoes);
}

export function HistoricoEventos({ animal_id }: HistoricoEventosProps) {
  const [eventos, setEventos] = useState<EventoRebanho[]>([]);
  const [lotes, setLotes] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarEventos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const eventosCarregados = await listEventosPorAnimal(animal_id);
        setEventos(eventosCarregados);

        // Buscar nomes dos lotes se houver eventos de transferência
        const lotesParaBuscar = new Set<string>();
        for (const evento of eventosCarregados) {
          if (
            evento.tipo === TipoEvento.TRANSFERENCIA_LOTE &&
            evento.lote_id_destino
          ) {
            lotesParaBuscar.add(evento.lote_id_destino);
          }
        }

        const lotesMap = new Map<string, string>();
        for (const loteId of lotesParaBuscar) {
          const lote = await getLoteById(loteId);
          if (lote) {
            lotesMap.set(loteId, lote.nome);
          }
        }
        setLotes(lotesMap);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar eventos'
        );
      } finally {
        setIsLoading(false);
      }
    };

    carregarEventos();
  }, [animal_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800 font-medium">Erro ao carregar eventos</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </Card>
    );
  }

  if (eventos.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Nenhum evento registrado</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {eventos.map((evento, idx) => {
        const IconComponent = iconMap[evento.tipo];
        const isLast = idx === eventos.length - 1;

        let descricao = '';
        switch (evento.tipo) {
          case TipoEvento.NASCIMENTO:
            descricao = 'Nascimento';
            if (evento.observacoes) {
              descricao += ` — ${evento.observacoes}`;
            }
            break;

          case TipoEvento.PESAGEM:
            descricao = `Pesagem: ${evento.peso_kg?.toFixed(1)} kg`;
            if (evento.observacoes) {
              descricao += ` — ${evento.observacoes}`;
            }
            break;

          case TipoEvento.MORTE:
            descricao = 'Morte';
            if (evento.observacoes) {
              descricao += ` — ${evento.observacoes}`;
            }
            break;

          case TipoEvento.VENDA:
            descricao = 'Venda';
            if (evento.comprador) {
              descricao += ` para ${evento.comprador}`;
            }
            if (evento.valor_venda) {
              descricao += ` — R$ ${evento.valor_venda.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            }
            if (evento.observacoes) {
              descricao += ` — ${evento.observacoes}`;
            }
            break;

          case TipoEvento.TRANSFERENCIA_LOTE:
            const nomeLoте = lotes.get(evento.lote_id_destino || '') ||
              'Lote desconhecido';
            descricao = `Transferência para Lote ${nomeLoте}`;
            if (evento.observacoes) {
              descricao += ` — ${evento.observacoes}`;
            }
            break;
        }

        return (
          <div key={evento.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                <IconComponent className="h-5 w-5 text-blue-600" />
              </div>
              {!isLast && (
                <div className="w-0.5 h-12 bg-gray-200 mt-2" />
              )}
            </div>

            <div className="flex-1 pb-6">
              <Card className="p-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{descricao}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatarData(evento.data_evento)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
      })}
    </div>
  );
}
