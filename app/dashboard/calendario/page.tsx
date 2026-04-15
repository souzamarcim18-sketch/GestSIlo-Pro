'use client';

import { useState, useEffect } from 'react';
import { Calendar, List, Grid3x3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

/**
 * Deriva o status visual de um evento:
 * - Se realizado, retorna 'Realizado'
 * - Se planejado mas data_esperada é no passado, retorna 'Atrasado'
 * - Caso contrário, retorna o status original
 */
function getStatusVisual(evento: EventoDAP_Extended): string {
  if (evento.status === 'Realizado') return 'Realizado';

  if (evento.status === 'Planejado' && evento.data_esperada) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEsperada = new Date(evento.data_esperada);
    dataEsperada.setHours(0, 0, 0, 0);

    if (dataEsperada < hoje) {
      return 'Atrasado';
    }
  }

  return evento.status;
}

export default function CalendarioPage() {
  const [viewTab, setViewTab] = useState<ViewTab>('lista');
  const [talhaoId, setTalhaoId] = useState<string>('');
  const [cultura, setCultura] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [eventos, setEventos] = useState<EventoDAP_Extended[]>([]);
  const [culturas, setCulturas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Carregar talhões
  useEffect(() => {
    const loadTalhoes = async () => {
      try {
        const { data, error } = await supabase
          .from('talhoes')
          .select('id, nome, fazenda_id, area_ha, tipo_solo, status, observacoes, created_at, updated_at')
          .order('nome');

        if (error) throw error;
        setTalhoes((data as Talhao[]) || []);
      } catch (error) {
        console.error('Erro ao carregar talhões:', error);
      }
    };

    loadTalhoes();
  }, []);

  // Carregar eventos e culturas
  useEffect(() => {
    const loadEventos = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('eventos_dap')
          .select('id, ciclo_id, talhao_id, cultura, tipo_operacao, dias_apos_plantio, dias_apos_plantio_final, data_esperada, data_realizada, status, atividade_campo_id, created_at, updated_at, talhoes(nome)');

        if (talhaoId) {
          query = query.eq('talhao_id', talhaoId);
        }

        if (cultura) {
          query = query.eq('cultura', cultura);
        }

        // Não filtrar por status no banco — usar lógica client-side para "Atrasado"
        if (status && status !== 'Atrasado') {
          query = query.eq('status', status);
        }

        const { data, error } = await query.order('data_esperada', { ascending: true });

        if (error) throw error;

        let eventosFormatted: EventoDAP_Extended[] = (data || []).map((evt: any) => ({
          ...evt,
          talhao_nome: evt.talhoes?.nome,
        }));

        // Filtro client-side para status "Atrasado"
        if (status === 'Atrasado') {
          eventosFormatted = eventosFormatted.filter(
            (evt) => getStatusVisual(evt) === 'Atrasado'
          );
        }

        setEventos(eventosFormatted);

        // Extrair culturas únicas
        const uniqueCulturas = Array.from(new Set(eventosFormatted.map((e) => e.cultura)));
        setCulturas(uniqueCulturas as string[]);
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEventos();
  }, [talhaoId, cultura, status]);

  // Renderizar badge de status
  const renderStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'Planejado': 'default',
      'Realizado': 'secondary',
      'Atrasado': 'destructive',
    };

    const icons: Record<string, string> = {
      'Planejado': '🔵',
      'Realizado': '🟢',
      'Atrasado': '🔴',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {icons[status] || ''} {status}
      </Badge>
    );
  };

  // Vista Lista
  const renderListView = () => (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="px-4 py-2 font-semibold">Data Esperada</th>
              <th className="px-4 py-2 font-semibold">Operação</th>
              <th className="px-4 py-2 font-semibold">Talhão</th>
              <th className="px-4 py-2 font-semibold">Cultura</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              {eventos.some((e) => e.data_realizada) && (
                <th className="px-4 py-2 font-semibold">Data Realizada</th>
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
                    {evento.data_realizada
                      ? new Date(evento.data_realizada).toLocaleDateString('pt-BR')
                      : '-'}
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

  // Vista Semanal Simplificada
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
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
          >
            ← Semana Anterior
          </Button>
          <span className="font-semibold">
            {days[0].toLocaleDateString('pt-BR')} — {days[6].toLocaleDateString('pt-BR')}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
          >
            Próxima Semana →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dayEventos = eventos.filter(
              (e) => e.data_esperada && new Date(e.data_esperada).toDateString() === day.toDateString()
            );

            return (
              <Card key={idx} className="min-h-24">
                <CardHeader className="p-3 pb-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">{day.getDate()}</div>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-1">
                  {dayEventos.slice(0, 2).map((evt) => {
                    const statusVisual = getStatusVisual(evt);
                    const statusIcon = statusVisual === 'Realizado' ? '🟢' : statusVisual === 'Atrasado' ? '🔴' : '🔵';
                    return (
                      <div key={evt.id} className="text-xs truncate flex items-center gap-1">
                        <span>{statusIcon}</span>
                        <span className="text-muted-foreground">{evt.tipo_operacao.substring(0, 12)}...</span>
                      </div>
                    );
                  })}
                  {dayEventos.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayEventos.length - 2}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Vista Mensal Simplificada
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date(year, month - 1))}
          >
            ← Mês Anterior
          </Button>
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date(year, month + 1))}
          >
            Próximo Mês →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2">
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-20 bg-muted/30 rounded" />;
            }

            const dayEventos = eventos.filter(
              (e) => e.data_esperada && new Date(e.data_esperada).toDateString() === day.toDateString()
            );

            return (
              <Card key={day.toDateString()} className="min-h-20">
                <CardHeader className="p-2 pb-1">
                  <div className="text-sm font-semibold">{day.getDate()}</div>
                </CardHeader>
                <CardContent className="p-2 pt-0 space-y-0.5">
                  {dayEventos.slice(0, 1).map((evt) => {
                    const statusVisual = getStatusVisual(evt);
                    const statusIcon = statusVisual === 'Realizado' ? '🟢' : statusVisual === 'Atrasado' ? '🔴' : '🔵';
                    return (
                      <div key={evt.id} className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {statusIcon}
                        </Badge>
                      </div>
                    );
                  })}
                  {dayEventos.length > 1 && (
                    <div className="text-xs text-muted-foreground">+{dayEventos.length - 1}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Calendário de Operações</h1>
        <p className="text-muted-foreground">Visualize e gerencie eventos DAP do ciclo agrícola</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Talhão</label>
              <Select value={talhaoId} onValueChange={(val) => setTalhaoId(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {talhoes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cultura</label>
              <Select value={cultura} onValueChange={(val) => setCultura(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {culturas.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(val) => setStatus(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="Planejado">Planejado</SelectItem>
                  <SelectItem value="Realizado">Realizado</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTalhaoId('');
                  setCultura('');
                  setStatus('');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-muted/50 border-0">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔵</span>
              <span className="text-sm">Planejado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🟢</span>
              <span className="text-sm">Realizado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔴</span>
              <span className="text-sm">Atrasado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas de Visualização */}
      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lista" className="gap-2">
            <List className="w-4 h-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="semanal" className="gap-2">
            <Grid3x3 className="w-4 h-4" />
            Semanal
          </TabsTrigger>
          <TabsTrigger value="mensal" className="gap-2">
            <Calendar className="w-4 h-4" />
            Mensal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            renderListView()
          )}
        </TabsContent>

        <TabsContent value="semanal" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            renderWeekView()
          )}
        </TabsContent>

        <TabsContent value="mensal" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            renderMonthView()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
