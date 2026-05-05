'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';
import type { Animal } from '@/lib/types/rebanho';

interface CalendarioReprodutivProps {
  eventos: EventoReprodutivo[];
  animais: Animal[];
}

interface KanbanCard {
  evento_id: string;
  animal_id: string;
  brinco: string;
  tipo: string;
  data_evento: string;
  status?: string;
}

interface KanbanColumn {
  label: string;
  borderColor: string;
  bgColor: string;
  cards: KanbanCard[];
}

const tipoEventoMap: Record<string, string> = {
  cobertura: 'Cobertura',
  diagnostico_prenhez: 'Diagnóstico',
  parto: 'Parto',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
};

export function CalendarioReprodutivo({ eventos, animais }: CalendarioReprodutivProps) {
  const [loteFilter, setLoteFilter] = useState<string>('');
  const [periodoInicio, setPeriodoInicio] = useState<string>(() => {
    const data = subDays(new Date(), 90);
    return data.toISOString().split('T')[0];
  });
  const [periodoFim, setPeriodoFim] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const handleLoteChange = (value: string | null) => {
    setLoteFilter(value ?? '');
  };

  const lotes = useMemo(() => {
    return Array.from(new Set(animais.map((a) => a.lote_id).filter(Boolean))) as string[];
  }, [animais]);

  const animalMapRef = useMemo(
    () => new Map(animais.map((a) => [a.id, a])),
    [animais]
  );

  const colunas = useMemo(() => {
    const hoje = new Date();
    const hoje_minus_45 = new Date(hoje);
    hoje_minus_45.setDate(hoje_minus_45.getDate() - 45);

    const diagnosticoPendente: KanbanCard[] = [];
    const partoPróximo: KanbanCard[] = [];
    const secagemPróxima: KanbanCard[] = [];
    const histórico: KanbanCard[] = [];

    // Separar eventos por data
    const eventosPorAnimal: Record<string, EventoReprodutivo[]> = {};
    eventos.forEach((e) => {
      if (!eventosPorAnimal[e.animal_id]) {
        eventosPorAnimal[e.animal_id] = [];
      }
      eventosPorAnimal[e.animal_id].push(e);
    });

    eventos.forEach((evento) => {
      const animal = animalMapRef.get(evento.animal_id);
      if (!animal) return;

      // Aplicar filtro de lote
      if (loteFilter && animal.lote_id !== loteFilter) return;

      // Aplicar filtro de período
      if (evento.data_evento < periodoInicio || evento.data_evento > periodoFim) return;

      const card: KanbanCard = {
        evento_id: evento.id,
        animal_id: evento.animal_id,
        brinco: animal.brinco,
        tipo: evento.tipo,
        data_evento: evento.data_evento,
      };

      // Diagnóstico Pendente: tipo='cobertura' E sem diagnóstico vinculado E data >= hoje-45dias
      if (evento.tipo === 'cobertura' && evento.data_evento >= hoje_minus_45.toISOString().split('T')[0]) {
        const temDiagnostico = eventosPorAnimal[evento.animal_id]?.some(
          (e) => e.tipo === 'diagnostico_prenhez' && e.data_evento > evento.data_evento
        );
        if (!temDiagnostico) {
          diagnosticoPendente.push(card);
        }
      }

      // Parto Próximo: prenhez confirmada + previsão entre hoje e hoje+30dias
      if (evento.tipo === 'diagnostico_prenhez' && evento.resultado_prenhez === 'positivo') {
        const diasGestacao = evento.idade_gestacional_dias || 0;
        const previsaoParto = new Date(evento.data_evento);
        previsaoParto.setDate(previsaoParto.getDate() + (283 - diasGestacao)); // 283 = dias gestação padrão

        if (previsaoParto >= hoje && previsaoParto <= new Date(periodoFim)) {
          // Evitar duplicatas
          if (!partoPróximo.some((c) => c.animal_id === evento.animal_id && c.tipo === 'diagnostico_prenhez')) {
            partoPróximo.push({
              ...card,
              tipo: 'parto_previsto',
              status: `Previsto: ${format(previsaoParto, 'dd/MM', { locale: ptBR })}`,
            });
          }
        }
      }

      // Secagem Próxima: parto recente (últimos 70 dias) + previsão_secagem entre hoje e hoje+15dias
      if (evento.tipo === 'parto') {
        const diasDesdePartoAvgSecagem = 60;
        const previsaoSecagem = new Date(evento.data_evento);
        previsaoSecagem.setDate(previsaoSecagem.getDate() + diasDesdePartoAvgSecagem);

        if (previsaoSecagem >= hoje && previsaoSecagem <= new Date(periodoFim)) {
          if (!secagemPróxima.some((c) => c.animal_id === evento.animal_id && c.tipo === 'secagem_prevista')) {
            secagemPróxima.push({
              ...card,
              tipo: 'secagem_prevista',
              status: `Prevista: ${format(previsaoSecagem, 'dd/MM', { locale: ptBR })}`,
            });
          }
        }
      }

      // Histórico: demais eventos (já fechados/concluídos)
      const isInOutherColumn =
        diagnosticoPendente.some((c) => c.evento_id === evento.id) ||
        partoPróximo.some((c) => c.evento_id === evento.id) ||
        secagemPróxima.some((c) => c.evento_id === evento.id);

      if (!isInOutherColumn) {
        histórico.push(card);
      }
    });

    const colunas: KanbanColumn[] = [
      {
        label: 'Diagnóstico Pendente',
        borderColor: 'border-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        cards: diagnosticoPendente,
      },
      {
        label: 'Parto Próximo',
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        cards: partoPróximo,
      },
      {
        label: 'Secagem Próxima',
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        cards: secagemPróxima,
      },
      {
        label: 'Histórico',
        borderColor: 'border-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-950/20',
        cards: histórico,
      },
    ];

    return colunas;
  }, [eventos, loteFilter, periodoInicio, periodoFim, animalMapRef]);


  const totalCards = colunas.reduce((sum, col) => sum + col.cards.length, 0);

  if (totalCards === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="lote-filtro">Lote</Label>
            <Select value={loteFilter} onValueChange={handleLoteChange}>
              <SelectTrigger id="lote-filtro">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {lotes.map((lote) => (
                  <SelectItem key={lote} value={lote}>
                    {lote}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodo-inicio">Data Inicial</Label>
            <Input
              id="periodo-inicio"
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodo-fim">Data Final</Label>
            <Input
              id="periodo-fim"
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
            />
          </div>
        </div>

        <div className="text-center mt-8">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum evento encontrado para os filtros selecionados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="lote-filtro">Lote</Label>
          <Select value={loteFilter} onValueChange={handleLoteChange}>
            <SelectTrigger id="lote-filtro">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {lotes.map((lote) => (
                <SelectItem key={lote} value={lote}>
                  {lote}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodo-inicio">Data Inicial</Label>
          <Input
            id="periodo-inicio"
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodo-fim">Data Final</Label>
          <Input
            id="periodo-fim"
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4 auto-rows-max">
        {colunas.map((coluna) => (
          <div
            key={coluna.label}
            className={`rounded-lg border-2 ${coluna.borderColor} ${coluna.bgColor} p-4 min-h-96`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{coluna.label}</h3>
              <Badge variant="secondary">{coluna.cards.length}</Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {coluna.cards.map((card) => (
                <div
                  key={card.evento_id}
                  className="bg-white dark:bg-slate-950 rounded-md p-3 border border-border/40 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-sm font-semibold text-brand-primary">
                      {card.brinco}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {tipoEventoMap[card.tipo] || card.tipo}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>{format(new Date(card.data_evento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    {card.status && <p className="text-xs text-brand-primary font-medium mt-1">{card.status}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
