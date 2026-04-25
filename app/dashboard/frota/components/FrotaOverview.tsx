'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Wrench, Clock, Fuel, DollarSign, AlertTriangle } from 'lucide-react';
import { type Maquina, type UsoMaquina, type Manutencao, type Abastecimento, type PlanoManutencao } from '@/lib/supabase';
import { verificarAlertaPlanoManutencao } from '@/lib/utils/frota';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FrotaOverviewProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  planosManutencao: PlanoManutencao[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="pt-6 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tooltip estilizado
// ---------------------------------------------------------------------------
const tooltipStyle = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function FrotaOverview({
  maquinas,
  usos,
  manutencoes,
  abastecimentos,
  planosManutencao,
  loading,
}: FrotaOverviewProps) {
  const hoje = useMemo(() => new Date(), []);
  const inicioMes = useMemo(() => startOfMonth(hoje), [hoje]);
  const fimMes = useMemo(() => endOfMonth(hoje), [hoje]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ativas = maquinas.filter((m) => m.status === 'Ativo').length;
    const emManutencao = maquinas.filter((m) => m.status === 'Em manutenção').length;

    const usosMes = usos.filter((u) => {
      const d = new Date(u.data);
      return d >= inicioMes && d <= fimMes;
    });
    const horasMes = usosMes.reduce((s, u) => s + (u.horas ?? 0), 0);

    const abasteciMes = abastecimentos.filter((a) => {
      const d = new Date(a.data);
      return d >= inicioMes && d <= fimMes;
    });
    const litrosMes = abasteciMes.reduce((s, a) => s + (a.litros ?? 0), 0);
    const valorDieselMes = abasteciMes.reduce((s, a) => s + (a.valor ?? 0), 0);

    const manutMes = manutencoes.filter((m) => {
      const dataRef = m.data_realizada ?? m.data_prevista ?? m.data;
      const d = new Date(dataRef);
      return d >= inicioMes && d <= fimMes;
    });
    const custoManutMes = manutMes.reduce((s, m) => s + (m.custo ?? 0), 0);
    const custoOperacional = custoManutMes + valorDieselMes;

    return { ativas, emManutencao, horasMes, litrosMes, valorDieselMes, custoOperacional };
  }, [maquinas, usos, abastecimentos, manutencoes, inicioMes, fimMes]);

  // ── Alertas ───────────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const manutVencidas = manutencoes.filter((m) => {
      if (!m.data_prevista || m.status === 'concluída') return false;
      return new Date(m.data_prevista) < hoje;
    });

    const planosAlerta = planosManutencao
      .filter((p) => p.ativo)
      .map((p) => {
        const maquina = maquinas.find((m) => m.id === p.maquina_id);
        const horimetro = maquina?.horimetro_atual ?? 0;
        const alerta = verificarAlertaPlanoManutencao(p, horimetro);
        return { plano: p, maquina, alerta };
      })
      .filter((x) => x.alerta.emAlerta);

    return { manutVencidas, planosAlerta };
  }, [manutencoes, planosManutencao, maquinas, hoje]);

  // ── Gráfico 1: Horas por máquina no mês ──────────────────────────────────
  const dadosHorasPorMaquina = useMemo(() => {
    return maquinas
      .map((m) => {
        const horas = usos
          .filter((u) => u.maquina_id === m.id && new Date(u.data) >= inicioMes && new Date(u.data) <= fimMes)
          .reduce((s, u) => s + (u.horas ?? 0), 0);
        return { nome: m.nome.length > 12 ? m.nome.slice(0, 12) + '…' : m.nome, horas: parseFloat(horas.toFixed(1)) };
      })
      .filter((d) => d.horas > 0);
  }, [maquinas, usos, inicioMes, fimMes]);

  // ── Gráfico 2: Custo por máquina no mês (combustível + manutenção) ────────
  const dadosCustoPorMaquina = useMemo(() => {
    return maquinas
      .map((m) => {
        const combustivel = abastecimentos
          .filter((a) => a.maquina_id === m.id && new Date(a.data) >= inicioMes && new Date(a.data) <= fimMes)
          .reduce((s, a) => s + (a.valor ?? 0), 0);
        const manutencao = manutencoes
          .filter((mt) => {
            const d = new Date(mt.data_realizada ?? mt.data_prevista ?? mt.data);
            return mt.maquina_id === m.id && d >= inicioMes && d <= fimMes;
          })
          .reduce((s, mt) => s + (mt.custo ?? 0), 0);
        return {
          nome: m.nome.length > 12 ? m.nome.slice(0, 12) + '…' : m.nome,
          combustivel: parseFloat(combustivel.toFixed(2)),
          manutencao: parseFloat(manutencao.toFixed(2)),
        };
      })
      .filter((d) => d.combustivel > 0 || d.manutencao > 0);
  }, [maquinas, abastecimentos, manutencoes, inicioMes, fimMes]);

  // ── Gráfico 3: Diesel últimos 6 meses ─────────────────────────────────────
  const dadosDiesel6Meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(hoje, 5 - i);
      const litros = abastecimentos
        .filter((a) => isSameMonth(new Date(a.data), mes))
        .reduce((s, a) => s + (a.litros ?? 0), 0);
      return {
        mes: format(mes, 'MMM/yy', { locale: ptBR }),
        litros: parseFloat(litros.toFixed(0)),
      };
    });
  }, [abastecimentos, hoje]);

  const temDados = maquinas.length > 0;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Máquinas Ativas"
          value={String(kpis.ativas)}
          icon={Truck}
          loading={loading}
        />
        <KpiCard
          title="Em Manutenção"
          value={String(kpis.emManutencao)}
          icon={Wrench}
          loading={loading}
        />
        <KpiCard
          title="Horas no Mês"
          value={`${kpis.horasMes.toFixed(1)} h`}
          icon={Clock}
          loading={loading}
        />
        <KpiCard
          title="Diesel no Mês"
          value={`${kpis.litrosMes.toFixed(0)} L`}
          sub={`R$ ${kpis.valorDieselMes.toFixed(2)}`}
          icon={Fuel}
          loading={loading}
        />
        <KpiCard
          title="Custo Operacional"
          value={`R$ ${kpis.custoOperacional.toFixed(2)}`}
          sub="Diesel + Manutenções"
          icon={DollarSign}
          loading={loading}
        />
      </div>

      {/* ── Alertas ────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : alertas.manutVencidas.length === 0 && alertas.planosAlerta.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta pendente.</p>
          ) : (
            <ul className="space-y-2">
              {alertas.manutVencidas.map((m) => {
                const nomeMaq = maquinas.find((mq) => mq.id === m.maquina_id)?.nome ?? '—';
                return (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive">Vencida</Badge>
                    <span>
                      {nomeMaq} — {m.descricao} (prevista {m.data_prevista ? format(new Date(m.data_prevista), 'dd/MM/yyyy') : '—'})
                    </span>
                  </li>
                );
              })}
              {alertas.planosAlerta.map(({ plano, maquina, alerta }) => (
                <li key={plano.id} className="flex items-center gap-2 text-sm">
                  <Badge variant={alerta.urgente ? 'destructive' : 'secondary'}>
                    {alerta.urgente ? 'Vencido' : 'Alerta'}
                  </Badge>
                  <span>
                    {maquina?.nome ?? '—'} — {plano.descricao}
                    {alerta.horasRestantes !== null && (
                      <span className="text-muted-foreground ml-1">
                        ({alerta.horasRestantes <= 0
                          ? `${Math.abs(alerta.horasRestantes).toFixed(0)} h vencido`
                          : `${alerta.horasRestantes.toFixed(0)} h restantes`})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Gráficos ───────────────────────────────────────────────────────── */}
      {!temDados && !loading ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Truck className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
            <p className="text-lg font-semibold text-muted-foreground">Nenhuma máquina cadastrada</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cadastre máquinas na aba Cadastro para ver os gráficos de desempenho.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Horas por máquina */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Horas por máquina — mês atual</CardTitle>
              <CardDescription>Horas trabalhadas no mês corrente</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : dadosHorasPorMaquina.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Nenhum registro de uso no mês.
                </p>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosHorasPorMaquina} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit=" h" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} h`, 'Horas']} />
                      <Bar dataKey="horas" fill="#00A651" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custo por máquina empilhado */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Custo operacional por máquina — mês atual</CardTitle>
              <CardDescription>Combustível + manutenções (R$)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : dadosCustoPorMaquina.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Nenhum custo registrado no mês.
                </p>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosCustoPorMaquina} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`R$ ${Number(v).toFixed(2)}`, n === 'combustivel' ? 'Combustível' : 'Manutenção']} />
                      <Legend formatter={(v) => v === 'combustivel' ? 'Combustível' : 'Manutenção'} />
                      <Bar dataKey="combustivel" stackId="a" fill="#00A651" />
                      <Bar dataKey="manutencao" stackId="a" fill="#6B8E23" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diesel 6 meses */}
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Consumo de diesel — últimos 6 meses</CardTitle>
              <CardDescription>Total de litros abastecidos por mês</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosDiesel6Meses} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit=" L" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} L`, 'Diesel']} />
                      <Line
                        type="monotone"
                        dataKey="litros"
                        stroke="#00A651"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
