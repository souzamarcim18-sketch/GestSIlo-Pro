'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, List, Grid3x3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { type Talhao, type EventoDAP } from '@/lib/types/talhoes';

type ViewTab = 'mensal' | 'semanal' | 'lista';

interface EventoDAP_Extended extends EventoDAP {
  talhao_nome?: string;
}

function getStatusVisual(evento: EventoDAP_Extended): string {
  if (evento.status === 'Realizado') return 'Realizado';
  if (evento.status === 'Planejado' && evento.data_esperada) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEsperada = new Date(evento.data_esperada);
    dataEsperada.setHours(0, 0, 0, 0);
    if (dataEsperada < hoje) return 'Atrasado';
  }
  return evento.status;
}

interface Props {
  initialTalhoes: Talhao[];
  initialEventos: EventoDAP_Extended[];
  initialCulturas: string[];
}

export function CalendarioClient({ initialTalhoes, initialEventos, initialCulturas }: Props) {
  const [viewTab, setViewTab] = useState<ViewTab>('lista');
  const [talhaoId, setTalhaoId] = useState('');
  const [cultura, setCultura] = useState('');
  const [status, setStatus] = useState('');
  const [eventos, setEventos] = useState<EventoDAP_Extended[]>(initialEventos);
  const [culturas, setCulturas] = useState<string[]>(initialCulturas);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchEventos = useCallback(async (filtTalhao: string, filtCultura: string, filtStatus: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('eventos_dap')
        .select('id, ciclo_id, talhao_id, cultura, tipo_operacao, dias_apos_plantio, dias_apos_plantio_final, data_esperada, data_realizada, status, atividade_campo_id, created_at, updated_at, talhoes(nome)');

      if (filtTalhao) query = query.eq('talhao_id', filtTalhao);
      if (filtCultura) query = query.eq('cultura', filtCultura);
      if (filtStatus && filtStatus !== 'Atrasado') query = query.eq('status', filtStatus);

      const { data, error } = await query.order('data_esperada', { ascending: true });
      if (error) throw error;

      let formatted: EventoDAP_Extended[] = (data || []).map((evt: any) => ({
        ...evt,
        talhao_nome: evt.talhoes?.nome,
      }));

      if (filtStatus === 'Atrasado') {
        formatted = formatted.filter((evt) => getStatusVisual(evt) === 'Atrasado');
      }

      setEventos(formatted);
      const unique = Array.from(new Set(formatted.map((e) => e.cultura)));
      setCulturas(unique as string[]);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTalhaoChange = (val: string) => {
    setTalhaoId(val);
    fetchEventos(val, cultura, status);
  };

  const handleCulturaChange = (val: string) => {
    setCultura(val);
    fetchEventos(talhaoId, val, status);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    fetchEventos(talhaoId, cultura, val);
  };

  const handleLimpar = () => {
    setTalhaoId('');
    setCultura('');
    setStatus('');
    fetchEventos('', '', '');
  };

  const renderStatusBadge = (s: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Planejado: 'default',
      Realizado: 'secondary',
      Atrasado: 'destructive',
    };
    const icons: Record<string, string> = { Planejado: '🔵', Realizado: '🟢', Atrasado: '🔴' };
    return <Badge variant={variants[s] || 'default'}>{icons[s] || ''} {s}</Badge>;
  };

  const renderListView = () => (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="px-4 py-2 font-semibold text-sm">Data Esperada</th>
              <th className="px-4 py-2 font-semibold text-sm">Operação</th>
              <th className="px-4 py-2 font-semibold text-sm">Talhão</th>
              <th className="px-4 py-2 font-semibold text-sm">Cultura</th>
              <th className="px-4 py-2 font-semibold text-sm">Status</th>
              {eventos.some((e) => e.data_realizada) && (
                <th className="px-4 py-2 font-semibold text-sm">Data Realizada</th>
              )}
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id} className="border-b hover:bg-muted/50 transition">
                <td className="px-4 py-3">
                  {evento.data_esperada ? new Date(evento.data_esperada).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-3">{evento.tipo_operacao}</td>
                <td className="px-4 py-3">{evento.talhao_nome || '-'}</td>
                <td className="px-4 py-3">{evento.cultura}</td>
                <td className="px-4 py-3">{renderStatusBadge(getStatusVisual(evento))}</td>
                {eventos.some((e) => e.data_realizada) && (
                  <td className="px-4 py-3">
                    {evento.data_realizada ? new Date(evento.data_realizada).toLocaleDateString('pt-BR') : '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {eventos.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum evento encontrado com os filtros selecionados.
          </div>
        )}
      </div>
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

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}>
            ← Semana Anterior
          </Button>
          <span className="font-semibold">
            {days[0].toLocaleDateString('pt-BR')} — {days[6].toLocaleDateString('pt-BR')}
          </span>
          <Button variant="outline" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}>
            Próxima Semana →
          </Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {days.map((day, idx) => {
              const dayEventos = eventos.filter(
                (e) => e.data_esperada && new Date(e.data_esperada).toDateString() === day.toDateString()
              );
              return (
                <Card key={idx} className="min-h-24">
                  <CardHeader className="p-3 pb-2">
                    <div className="text-sm font-semibold text-muted-foreground">
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold">{day.getDate()}</div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1">
                    {dayEventos.slice(0, 2).map((evt) => {
                      const sv = getStatusVisual(evt);
                      return (
                        <div key={evt.id} className="text-xs truncate flex items-center gap-1">
                          <span>{sv === 'Realizado' ? '🟢' : sv === 'Atrasado' ? '🔴' : '🔵'}</span>
                          <span className="text-muted-foreground">{evt.tipo_operacao.substring(0, 12)}...</span>
                        </div>
                      );
                    })}
                    {dayEventos.length > 2 && <div className="text-xs text-muted-foreground">+{dayEventos.length - 2}</div>}
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setCurrentDate(new Date(year, month - 1))}>← Mês Anterior</Button>
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="outline" onClick={() => setCurrentDate(new Date(year, month + 1))}>Próximo Mês →</Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
              <div key={d} className="text-center font-semibold text-base p-2">{d}</div>
            ))}
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-20 bg-muted/30 rounded" />;
              const dayEventos = eventos.filter(
                (e) => e.data_esperada && new Date(e.data_esperada).toDateString() === day.toDateString()
              );
              return (
                <Card key={day.toDateString()} className="min-h-20">
                  <CardHeader className="p-2 pb-1">
                    <div className="text-base font-semibold">{day.getDate()}</div>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 space-y-0.5">
                    {dayEventos.slice(0, 1).map((evt) => {
                      const sv = getStatusVisual(evt);
                      return (
                        <div key={evt.id} className="text-xs">
                          <Badge variant="outline" className="text-xs">
                            {sv === 'Realizado' ? '🟢' : sv === 'Atrasado' ? '🔴' : '🔵'}
                          </Badge>
                        </div>
                      );
                    })}
                    {dayEventos.length > 1 && <div className="text-xs text-muted-foreground">+{dayEventos.length - 1}</div>}
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Calendário de Operações</h2>
        <p className="text-muted-foreground">Visualize e gerencie eventos DAP do ciclo agrícola</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-base font-medium">Talhão</label>
              <Select value={talhaoId} onValueChange={(val) => handleTalhaoChange(val ?? '')}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {initialTalhoes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium">Cultura</label>
              <Select value={cultura} onValueChange={(val) => handleCulturaChange(val ?? '')}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {culturas.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium">Status</label>
              <Select value={status} onValueChange={(val) => handleStatusChange(val ?? '')}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="Planejado">Planejado</SelectItem>
                  <SelectItem value="Realizado">Realizado</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleLimpar}>Limpar Filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 border-0">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2"><span className="text-lg">🔵</span><span className="text-base">Planejado</span></div>
            <div className="flex items-center gap-2"><span className="text-lg">🟢</span><span className="text-base">Realizado</span></div>
            <div className="flex items-center gap-2"><span className="text-lg">🔴</span><span className="text-base">Atrasado</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
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

        <div className="mt-4">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : viewTab === 'lista' ? renderListView()
            : viewTab === 'semanal' ? renderWeekView()
            : renderMonthView()}
        </div>
      </div>
    </div>
  );
}
