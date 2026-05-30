'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Clock, Plus } from 'lucide-react';
import { FormEventoSanitario } from '@/components/rebanho/FormEventoSanitario';
import type { AlertaSanitario, EventoSanitarioRow, TipoEventoSanitario } from '@/lib/types/rebanho-sanitario';
import type { Animal, Lote } from '@/lib/types/rebanho';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface SanidadeDashboardProps {
  alertas: AlertaSanitario[];
  eventos: EventoSanitarioRow[];
  animais: Animal[];
  lotes: Lote[];
}

const TIPO_LABELS: Record<TipoEventoSanitario, string> = {
  vacinacao: 'Vacinação',
  vermifugacao: 'Vermifugação',
  tratamento_veterinario: 'Tratamento',
  exame_laboratorial: 'Exame',
};

const TIPO_COLORS: Record<TipoEventoSanitario, string> = {
  vacinacao: 'bg-green-100 text-green-800 border-green-300',
  vermifugacao: 'bg-blue-100 text-blue-800 border-blue-300',
  tratamento_veterinario: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  exame_laboratorial: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function SanidadeDashboard({
  alertas,
  eventos,
  animais,
  lotes,
}: SanidadeDashboardProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoEventoSanitario | 'todos'>('todos');
  const [filtroBrinco, setFiltroBrinco] = useState('');
  const [page, setPage] = useState(0);

  // Separar alertas em vencidos e próximos
  const alertasVencidos = alertas.filter((a) => a.dias_para_vencimento < 0);
  const alertasProximos = alertas.filter((a) => a.dias_para_vencimento >= 0 && a.dias_para_vencimento <= 15);
  const temAlertas = alertasVencidos.length > 0 || alertasProximos.length > 0;

  // Eventos por dia para o calendário
  const eventosPorDia = eventos.reduce((acc, evt) => {
    const dia = evt.data_evento;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(evt);
    return acc;
  }, {} as Record<string, EventoSanitarioRow[]>);

  // Dias do mês atual
  const diasMes = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Dias da semana anterior e próxima para completar grade
  const primeiroDia = diasMes[0];
  const diasAnteriores = Array(primeiroDia.getDay()).fill(null);
  const ultimoDia = diasMes[diasMes.length - 1];
  const diasProximos = Array(6 - ultimoDia.getDay()).fill(null);
  const diasCompleto = [...diasAnteriores, ...diasMes, ...diasProximos];

  // Filtrar eventos
  let eventosFiltrados = eventos;
  if (filtroTipo !== 'todos') {
    eventosFiltrados = eventosFiltrados.filter((e) => e.tipo === filtroTipo);
  }
  if (filtroBrinco) {
    const animal = animais.find((a) => a.brinco.toLowerCase().includes(filtroBrinco.toLowerCase()));
    if (animal) {
      eventosFiltrados = eventosFiltrados.filter((e) => e.animal_id === animal.id);
    } else {
      eventosFiltrados = [];
    }
  }

  const eventosOrdenados = [...eventosFiltrados].sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
  const ITEMS_PER_PAGE = 20;
  const eventosPaginados = eventosOrdenados.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(eventosOrdenados.length / ITEMS_PER_PAGE);

  const eventosSelecionados = selectedDay
    ? (eventosPorDia[selectedDay.toISOString().split('T')[0]] || [])
    : [];

  const getAnimalInfo = (animalId: string) => {
    return animais.find((a) => a.id === animalId);
  };

  return (
    <div className="space-y-6">
      {/* ===== SEÇÃO C: HISTÓRICO + BOTÃO REGISTRAR (movido para o topo) ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Eventos Sanitários</CardTitle>
              <CardDescription>Lista cronológica de todos os eventos registrados</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) router.refresh(); }}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 w-4 h-4" />
                  Registrar Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Evento Sanitário</DialogTitle>
                  <DialogDescription>
                    Registre vacinações, vermifugações, tratamentos e exames
                  </DialogDescription>
                </DialogHeader>
                <FormEventoSanitario
                  lotes={lotes}
                  animais={animais}
                  onSuccess={() => { setIsDialogOpen(false); router.refresh(); }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium uppercase tracking-[0.13em] text-muted-foreground">Tipo de Evento</label>
              <select
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value as TipoEventoSanitario | 'todos');
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
              >
                <option value="todos">Todos</option>
                <option value="vacinacao">Vacinação</option>
                <option value="vermifugacao">Vermifugação</option>
                <option value="tratamento_veterinario">Tratamento</option>
                <option value="exame_laboratorial">Exame</option>
              </select>
            </div>

            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium uppercase tracking-[0.13em] text-muted-foreground">Buscar por Brinco</label>
              <input
                type="text"
                placeholder="Digite o brinco..."
                value={filtroBrinco}
                onChange={(e) => {
                  setFiltroBrinco(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Animal</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Detalhes</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Responsável</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Próx. Dose</th>
                </tr>
              </thead>
              <tbody>
                {eventosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground">
                      Nenhum evento encontrado
                    </td>
                  </tr>
                ) : (
                  eventosPaginados.map((evt) => {
                    const animal = getAnimalInfo(evt.animal_id);
                    let detalhes = '';
                    if (evt.tipo === 'vacinacao' || evt.tipo === 'vermifugacao') {
                      detalhes = `${evt.vacina_nome} - ${evt.dose || 'N/A'}`;
                    } else if (evt.tipo === 'tratamento_veterinario') {
                      detalhes = evt.diagnostico || 'N/A';
                    } else if (evt.tipo === 'exame_laboratorial') {
                      detalhes = evt.tipo_exame || 'N/A';
                    }

                    return (
                      <tr key={evt.id} className="border-b border-border hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 text-foreground">
                          {format(new Date(evt.data_evento), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={`${TIPO_COLORS[evt.tipo]}`}>
                            {TIPO_LABELS[evt.tipo]}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {animal?.brinco} {animal?.nome && `(${animal.nome})`}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{detalhes}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{evt.responsavel || '-'}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {evt.data_proxima_dose ? format(new Date(evt.data_proxima_dose), 'dd/MM/yyyy') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SEÇÃO A: ALERTAS SANITÁRIOS ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas Sanitários
          </CardTitle>
          <CardDescription>Vacinações vencidas e próximas dos próximos 15 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {!temAlertas ? (
            <div className="flex items-center justify-center gap-2 py-8 text-primary rounded-lg border border-border bg-primary/5">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Rebanho em dia ✓</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Vacinações Vencidas */}
              <div className="space-y-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Vacinações Vencidas
                </h3>
                {alertasVencidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma vacinação vencida</p>
                ) : (
                  <div className="space-y-2">
                    {alertasVencidos.map((alerta) => (
                      <div key={alerta.animal_id + alerta.vacina_nome} className="text-sm border-l-2 border-destructive pl-3 py-1">
                        <p className="font-medium text-foreground">
                          {alerta.animal_brinco}
                          {alerta.animal_nome ? ` (${alerta.animal_nome})` : ''}
                        </p>
                        <p className="text-muted-foreground">{alerta.vacina_nome}</p>
                        <p className="text-xs text-destructive">
                          {Math.abs(alerta.dias_para_vencimento)} dias de atraso
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Próximas Vacinações */}
              <div className="space-y-3 p-4 rounded-lg border border-border" style={{ background: 'var(--gold-dim, rgba(245,208,0,0.08))' }}>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--warning, #f5d000)' }}>
                  <Clock className="w-4 h-4" />
                  Próximas dos Próximos 15 Dias
                </h3>
                {alertasProximos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma vacinação próxima</p>
                ) : (
                  <div className="space-y-2">
                    {alertasProximos.map((alerta) => (
                      <div
                        key={alerta.animal_id + alerta.vacina_nome}
                        className="text-sm border-l-2 pl-3 py-1"
                        style={{ borderColor: 'var(--warning, #f5d000)' }}
                      >
                        <p className="font-medium text-foreground">
                          {alerta.animal_brinco}
                          {alerta.animal_nome ? ` (${alerta.animal_nome})` : ''}
                        </p>
                        <p className="text-muted-foreground">{alerta.vacina_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Em {alerta.dias_para_vencimento} dias
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SEÇÃO B: CALENDÁRIO SANITÁRIO ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendário Sanitário</CardTitle>
              <CardDescription>Eventos por dia do mês</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                ← Anterior
              </Button>
              <span className="flex items-center px-3 text-sm font-medium text-foreground">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                Próximo →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grade do calendário */}
          <div className="grid grid-cols-7 gap-1.5">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((dia) => (
              <div key={dia} className="text-center font-semibold text-xs text-muted-foreground py-2">
                {dia}
              </div>
            ))}

            {diasCompleto.map((dia, idx) => {
              const temEvento = dia && eventosPorDia[dia.toISOString().split('T')[0]];
              const isSelected = dia && selectedDay && isSameDay(dia, selectedDay);
              const isOutsideMonth = !dia || !isSameMonth(dia, currentMonth);

              return (
                <button
                  key={idx}
                  onClick={() => dia && setSelectedDay(dia)}
                  className={`aspect-square rounded-lg border p-1 text-center transition-all ${
                    isOutsideMonth
                      ? 'border-transparent opacity-20 cursor-default'
                      : isSelected
                        ? 'border-primary bg-primary/15 text-foreground'
                        : temEvento
                          ? 'border-primary/40 bg-primary/8 text-foreground hover:border-primary/60'
                          : 'border-border bg-card text-foreground hover:border-border/80 hover:bg-white/5'
                  }`}
                >
                  {dia && (
                    <>
                      <div className="text-xs font-medium">{dia.getDate()}</div>
                      {temEvento && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                          {temEvento.slice(0, 2).map((evt: EventoSanitarioRow, i: number) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${
                                evt.tipo === 'vacinacao'
                                  ? 'bg-green-500'
                                  : evt.tipo === 'vermifugacao'
                                    ? 'bg-blue-500'
                                    : evt.tipo === 'tratamento_veterinario'
                                      ? 'bg-yellow-500'
                                      : 'bg-purple-500'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Eventos do dia selecionado */}
          {selectedDay && (
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="font-semibold text-foreground">
                Eventos em {format(selectedDay, 'dd/MM/yyyy', { locale: ptBR })}
              </h3>
              {eventosSelecionados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento neste dia</p>
              ) : (
                <div className="space-y-2">
                  {eventosSelecionados.map((evt) => {
                    const animal = getAnimalInfo(evt.animal_id);
                    return (
                      <div key={evt.id} className={`p-3 rounded-lg border ${TIPO_COLORS[evt.tipo]}`}>
                        <p className="font-medium">
                          {TIPO_LABELS[evt.tipo]} - {animal?.brinco} {animal?.nome && `(${animal.nome})`}
                        </p>
                        {evt.vacina_nome && <p className="text-sm">{evt.vacina_nome}</p>}
                        {evt.diagnostico && <p className="text-sm">{evt.diagnostico}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
