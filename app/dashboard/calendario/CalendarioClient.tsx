'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, List, Grid3x3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  type EventoCalendario,
  type ModuloCalendario,
  type GrupoCalendario,
  MODULO_CONFIG,
  GRUPO_CONFIG,
  GRUPOS_CALENDARIO,
} from '@/lib/types/calendario';
import { formatarDataBR } from '@/app/dashboard/alertas-helpers';

type ViewTab = 'mensal' | 'semanal' | 'lista';

interface Props {
  initialEventos: EventoCalendario[];
  talhoes: Array<{ id: string; nome: string }>;
  mesAtual: string; // 'YYYY-MM'
}

function ModuloBadge({ modulo }: { modulo: ModuloCalendario }) {
  const { label, bgClass, colorClass } = MODULO_CONFIG[modulo];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgClass} ${colorClass}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: EventoCalendario['status'] }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    planejado: 'default',
    realizado: 'secondary',
    atrasado: 'destructive',
    concluido: 'outline',
  };
  const labels: Record<string, string> = {
    planejado: 'Planejado',
    realizado: 'Realizado',
    atrasado: 'Atrasado',
    concluido: 'Concluído',
  };
  return <Badge variant={variants[status] ?? 'default'}>{labels[status] ?? status}</Badge>;
}

function EventoPonto({ modulo }: { modulo: ModuloCalendario }) {
  const { dotClass } = MODULO_CONFIG[modulo];
  return <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />;
}

export function CalendarioClient({ initialEventos, talhoes, mesAtual }: Props) {
  const router = useRouter();
  const [viewTab, setViewTab] = useState<ViewTab>('mensal');
  const [grupo, setGrupo] = useState<GrupoCalendario>('agricolas');
  const [talhaoId, setTalhaoId] = useState('');
  const [modulosSelecionados, setModulosSelecionados] = useState<ModuloCalendario[]>([]);

  // Módulos visíveis dependem do grupo (aba) selecionado
  const modulosDoGrupo = GRUPO_CONFIG[grupo].modulos;
  const [currentDate, setCurrentDate] = useState(() => {
    const [ano, mes] = mesAtual.split('-').map(Number);
    return new Date(ano, mes - 1, 1);
  });

  function navegarMes(delta: number) {
    const [ano, mes] = mesAtual.split('-').map(Number);
    const novaData = new Date(ano, mes - 1 + delta, 1);
    const novoMes = novaData.toISOString().slice(0, 7);
    router.push(`/dashboard/calendario?mes=${novoMes}${talhaoId ? `&talhao=${talhaoId}` : ''}`);
  }

  function handleTalhaoChange(val: string | null) {
    const v = val ?? '';
    setTalhaoId(v);
    const q = new URLSearchParams();
    q.set('mes', mesAtual);
    if (v) q.set('talhao', v);
    router.push(`/dashboard/calendario?${q.toString()}`);
  }

  function toggleModulo(modulo: ModuloCalendario) {
    setModulosSelecionados((prev) =>
      prev.includes(modulo) ? prev.filter((m) => m !== modulo) : [...prev, modulo],
    );
  }

  const eventosFiltrados = useMemo(() => {
    // 1) Restringe ao grupo (aba) selecionado
    let resultado = initialEventos.filter((e) => modulosDoGrupo.includes(e.modulo));
    // 2) Filtro individual de módulo dentro do grupo
    if (modulosSelecionados.length > 0) {
      resultado = resultado.filter((e) => modulosSelecionados.includes(e.modulo));
    }
    if (talhaoId) {
      resultado = resultado.filter((e) =>
        e.talhaoId === talhaoId ||
        !['lavoura_dap', 'lavoura_atividade'].includes(e.modulo),
      );
    }
    return resultado;
  }, [initialEventos, modulosDoGrupo, modulosSelecionados, talhaoId]);

  function handleGrupoChange(novoGrupo: GrupoCalendario) {
    setGrupo(novoGrupo);
    setModulosSelecionados([]); // reset do filtro individual ao trocar de aba
  }

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-left">
            <th className="px-4 py-2 font-semibold text-sm">Módulo</th>
            <th className="px-4 py-2 font-semibold text-sm">Evento</th>
            <th className="px-4 py-2 font-semibold text-sm">Data</th>
            <th className="px-4 py-2 font-semibold text-sm">Status</th>
          </tr>
        </thead>
        <tbody>
          {eventosFiltrados.map((evento) => (
            <tr
              key={evento.id}
              className={`border-b transition ${evento.href ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              onClick={() => evento.href && router.push(evento.href)}
            >
              <td className="px-4 py-3">
                <ModuloBadge modulo={evento.modulo} />
              </td>
              <td className="px-4 py-3">
                <span className="text-sm font-medium">{evento.titulo}</span>
                {evento.subtitulo && (
                  <span className="block text-xs text-muted-foreground">{evento.subtitulo}</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                {formatarDataBR(evento.data)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={evento.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {eventosFiltrados.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          Nenhum evento encontrado com os filtros selecionados.
        </div>
      )}
    </div>
  );

  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });

    const prevSemana = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    };
    const nextSemana = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={prevSemana}>← Semana Anterior</Button>
          <span className="font-semibold">
            {days[0].toLocaleDateString('pt-BR')} — {days[6].toLocaleDateString('pt-BR')}
          </span>
          <Button variant="outline" onClick={nextSemana}>Próxima Semana →</Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {days.map((day, idx) => {
              const isoDay = day.toISOString().slice(0, 10);
              const dayEventos = eventosFiltrados.filter((e) => e.data === isoDay);
              return (
                <Card key={idx} className="min-h-24">
                  <CardHeader className="p-3 pb-2">
                    <div className="text-sm font-semibold text-muted-foreground">
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold">{day.getDate()}</div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1">
                    {dayEventos.slice(0, 4).map((evt) => (
                      <div
                        key={evt.id}
                        className="text-xs truncate flex items-center gap-1"
                        title={evt.titulo}
                      >
                        <EventoPonto modulo={evt.modulo} />
                        <span className="text-muted-foreground truncate">{evt.titulo}</span>
                      </div>
                    ))}
                    {dayEventos.length > 4 && (
                      <div className="text-xs text-muted-foreground">+{dayEventos.length - 4}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const [ano, mes] = mesAtual.split('-').map(Number);
    const firstDay = new Date(ano, mes - 1, 1);
    const lastDay = new Date(ano, mes, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(ano, mes - 1, i));

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navegarMes(-1)}>← Mês Anterior</Button>
          <h2 className="text-lg font-semibold capitalize">
            {firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="outline" onClick={() => navegarMes(1)}>Próximo Mês →</Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
              <div key={d} className="text-center font-semibold text-base p-2">{d}</div>
            ))}
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-20 bg-muted/30 rounded" />;
              const isoDay = day.toISOString().slice(0, 10);
              const dayEventos = eventosFiltrados.filter((e) => e.data === isoDay);
              return (
                <Card key={day.toDateString()} className="min-h-20">
                  <CardHeader className="p-2 pb-1">
                    <div className="text-base font-semibold">{day.getDate()}</div>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 space-y-0.5">
                    {dayEventos.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-center gap-1"
                        title={evt.titulo}
                      >
                        <EventoPonto modulo={evt.modulo} />
                        <span className="text-xs truncate text-muted-foreground">{evt.titulo}</span>
                      </div>
                    ))}
                    {dayEventos.length > 3 && (
                      <div className="text-xs text-muted-foreground">+{dayEventos.length - 3}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PageHeader icon={Calendar} titulo="Calendário de Atividades" />
        <p className="text-muted-foreground">{GRUPO_CONFIG[grupo].descricao}</p>
      </div>

      {/* Abas de grupo */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-muted/50 border border-border p-[3px]">
        {GRUPOS_CALENDARIO.map((g) => (
          <button
            key={g}
            onClick={() => handleGrupoChange(g)}
            className={`flex-1 min-w-[140px] rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
              grupo === g
                ? 'bg-[#00A651] text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            {GRUPO_CONFIG[g].label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Talhão</label>
              <Select value={talhaoId} onValueChange={handleTalhaoChange}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {talhoes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTalhaoId('');
                  setModulosSelecionados([]);
                  router.push(`/dashboard/calendario?mes=${mesAtual}`);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Filtro de módulos */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Módulos</label>
            <div className="flex flex-wrap gap-2">
              {modulosDoGrupo.map((modulo) => {
                const { label, bgClass, colorClass } = MODULO_CONFIG[modulo];
                const ativo = modulosSelecionados.includes(modulo);
                return (
                  <button
                    key={modulo}
                    onClick={() => toggleModulo(modulo)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity ${
                      ativo || modulosSelecionados.length === 0
                        ? `${bgClass} ${colorClass} border-transparent`
                        : 'bg-muted/30 text-muted-foreground border-transparent opacity-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-muted/50 border-0">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4">
            {modulosDoGrupo.map((modulo) => {
              const { label, dotClass } = MODULO_CONFIG[modulo];
              return (
                <div key={modulo} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de visão + controles de mês */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 border border-border p-[3px]">
            {([
              { value: 'lista', label: 'Lista', icon: List },
              { value: 'semanal', label: 'Semanal', icon: Grid3x3 },
              { value: 'mensal', label: 'Mensal', icon: Calendar },
            ] as { value: ViewTab; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setViewTab(value)}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  viewTab === value
                    ? 'bg-[#00A651] text-white font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {viewTab === 'lista' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navegarMes(-1)}>← Anterior</Button>
              <span className="text-sm font-medium whitespace-nowrap">
                {new Date(currentDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => navegarMes(1)}>Próximo →</Button>
            </div>
          )}
        </div>

        <div className="mt-4">
          {viewTab === 'lista' ? renderListView()
            : viewTab === 'semanal' ? renderWeekView()
            : renderMonthView()}
        </div>
      </div>
    </div>
  );
}
