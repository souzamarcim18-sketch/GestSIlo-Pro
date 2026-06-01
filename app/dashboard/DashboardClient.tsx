'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useMemo } from 'react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { getPrefetchTimestamp } from '@/lib/db/prefetch';
import Link from 'next/link';
import {
  Map,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
  Leaf,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, formatBRL } from '@/lib/utils';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { KpiChartCard } from '@/components/widgets/KpiChartCard';
import { SilagemMetricasCard } from '@/components/widgets/SilagemMetricasCard';
import { SilosInfoCard } from '@/components/widgets/SilosInfoCard';
import { Skeleton } from '@/components/ui/skeleton';

const GaugeOcupacaoSilos = dynamic(
  () => import('@/components/widgets/GaugeOcupacaoSilos').then((m) => ({ default: m.GaugeOcupacaoSilos })),
  { ssr: false, loading: () => <Skeleton className="h-36 w-36 rounded-full" /> },
);
const PieCategoriasRebanho = dynamic(
  () => import('@/components/widgets/PieCategoriasRebanho').then((m) => ({ default: m.PieCategoriasRebanho })),
  { ssr: false, loading: () => <Skeleton className="h-36 w-36 rounded-full" /> },
);
import type { DashboardData, AlertaSeveridade } from './dashboard-data';
import { AtividadesRecentesList } from '@/components/dashboard/AtividadesRecentesList';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] mb-3" style={{ color: '#dceede' }}>
      {children}
    </p>
  );
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  href,
  className,
}: {
  title: string;
  value: string;
  detail: string;
  icon?: React.ElementType;
  href: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={cn('text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]', className)}
    >
      <Card className="rounded-[13px] p-4 md:p-5 h-full transition-all duration-300 group-hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="uppercase tracking-[0.13em] font-bold text-xs md:text-sm text-[#688070]">{title}</p>
            <p className="text-xl md:text-2xl font-black tracking-tight text-[#dceede] truncate">{value}</p>
            <p className="text-xs md:text-sm text-[#688070] truncate">{detail}</p>
          </div>
          {Icon && (
            <div
              className="shrink-0 p-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Icon className="h-4 w-4 text-[#00c45a]" />
            </div>
          )}
        </div>
      </Card>
    </button>
  );
}

function FinanceiroCard({
  title,
  value,
  variante,
  href,
  subtitle = 'Mês corrente',
}: {
  title: string;
  value: string;
  variante: 'receita' | 'despesa' | 'saldo_positivo' | 'saldo_negativo';
  href: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const valueColor =
    variante === 'receita'
      ? 'text-[#00c45a]'
      : variante === 'despesa'
        ? 'text-[#f87171]'
        : variante === 'saldo_positivo'
          ? 'text-[#00c45a]'
          : 'text-[#f87171]';
  return (
    <button
      onClick={() => router.push(href)}
      className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]"
    >
      <Card className="rounded-[13px] p-4 h-full transition-all duration-300 group-hover:-translate-y-1">
        <div className="space-y-1.5">
          <p className="uppercase tracking-[0.13em] font-bold text-xs text-[#688070]">{title}</p>
          <p className={cn('text-xl md:text-2xl font-black tracking-tight truncate', valueColor)}>{value}</p>
          <p className="text-xs text-[#688070]">{subtitle}</p>
        </div>
      </Card>
    </button>
  );
}

const ORDEM_SEVERIDADE: Record<AlertaSeveridade, number> = {
  critico: 0,
  urgente: 1,
  aviso: 2,
};

const ALERTA_CONFIG: Record<AlertaSeveridade, {
  Icon: React.ElementType;
  iconClass: string;
  bgClass: string;
}> = {
  critico: { Icon: AlertCircle,   iconClass: 'text-status-danger',   bgClass: 'bg-status-danger/10'   },
  urgente: { Icon: AlertTriangle, iconClass: 'text-status-warning',  bgClass: 'bg-status-warning/10'  },
  aviso:   { Icon: Info,          iconClass: 'text-status-info',     bgClass: 'bg-status-info/10'     },
};

export function DashboardClient({ data, userName }: { data: DashboardData; userName: string }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const alertShownRef = useRef(false);
  const prefetchAt = useMemo(
    () => (!isOnline ? getPrefetchTimestamp() : null),
    [isOnline]
  );

  const hour = new Date().getHours();
  const greeting =
    hour >= 12 && hour < 18 ? 'Boa tarde' : hour >= 18 || hour < 5 ? 'Boa noite' : 'Bom dia';

  useEffect(() => {
    if (alertShownRef.current) return;
    const alertaOp = data.proximasOperacoes.find((op) => op.janelaColheita?.ativo);
    if (alertaOp?.janelaColheita && !sessionStorage.getItem('alerta_silagem_exibido')) {
      toast.warning(
        `Atenção: janela de colheita de ${alertaOp.cultura} no ${alertaOp.talhao_nome} se aproxima em ${alertaOp.janelaColheita.diasRestantes} dias`
      );
      sessionStorage.setItem('alerta_silagem_exibido', 'true');
      alertShownRef.current = true;
    }
  }, [data.proximasOperacoes]);

  const alertasOrdenados = [...data.alertas].sort(
    (a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]
  );
  const alertasExibidos = alertasOrdenados.slice(0, 5);
  const alertasOcultos = alertasOrdenados.length - alertasExibidos.length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 min-h-screen bg-muted/30">
      {prefetchAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-border rounded-lg px-3 py-2 w-fit">
          <Info className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          Dados de {prefetchAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — modo offline
        </div>
      )}
      {/* Cabeçalho */}
      <div className="space-y-1 mb-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#dceede]">
          {greeting}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua propriedade</p>
      </div>

      {/* Alertas Críticos — banner condicional no topo */}
      {alertasExibidos.length > 0 && (
        <Card className="bg-card rounded-2xl p-4 md:p-5 shadow-sm border border-status-danger/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-status-danger shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-[0.13em] text-status-danger">
              Alertas Críticos
            </h2>
            {alertasOcultos > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                +{alertasOcultos} alerta{alertasOcultos > 1 ? 's' : ''} adicional{alertasOcultos > 1 ? 'is' : ''}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {alertasExibidos.map((alerta) => {
              const { Icon, iconClass, bgClass } = ALERTA_CONFIG[alerta.severidade];
              return (
                <button
                  key={alerta.id}
                  onClick={() => router.push(alerta.href)}
                  className="w-full text-left p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${bgClass}`}>
                    <Icon className={`w-4 h-4 ${iconClass}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{alerta.mensagem}</p>
                    {alerta.detalhe && (
                      <p className="text-xs text-muted-foreground mt-0.5">{alerta.detalhe}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Silagem */}
      <section aria-label="Silagem">
        <SectionLabel>Silagem</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="row-span-2 flex">
            <button
              onClick={() => router.push('/dashboard/silos')}
              className="text-left group w-full flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]"
            >
              <div className="relative rounded-[13px] border border-border bg-card p-5 flex flex-col gap-4 h-full transition-all duration-300 group-hover:-translate-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.14)]">
                <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#688070]">Ocupação dos Silos</p>
                {/* Gauge centralizado */}
                <div className="flex justify-center">
                  <GaugeOcupacaoSilos percentual={data.silosOcupacaoPctNum} />
                </div>
                {/* Estoque abaixo do gauge */}
                <div className="text-center -mt-2">
                  <p className="text-base font-bold tracking-tight text-[#dceede]">{data.silosGaugeDetalhe}</p>
                  <p className="text-xs text-muted-foreground">estoque atual</p>
                </div>
                {/* Barras de silos ocupando largura total */}
                {data.silosAbertosNomes.length > 0 ? (
                  <div className="space-y-2 w-full">
                    {data.silosAbertosNomes.map((nome) => (
                      <div key={nome} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{nome}</span>
                          <span className="text-xs font-semibold text-[#dceede] ml-2">{data.silosOcupacaoPctNum}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${data.silosOcupacaoPctNum}%`,
                              background: data.silosOcupacaoPctNum > 90
                                ? 'var(--chart-1)'
                                : data.silosOcupacaoPctNum > 50
                                ? 'var(--chart-2)'
                                : 'var(--chart-3)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Nenhum silo aberto</p>
                )}
              </div>
            </button>
          </div>
          <div className="row-span-2 flex">
            <SilagemMetricasCard
              autonomia={data.silosAutonomiaDias}
              consumo={data.silosConsumoDiario}
              taxaPerdas={data.silosTaxaPerdas}
            />
          </div>
          <div className="row-span-2 flex">
            <SilosInfoCard
              silosAbertos={isNaN(parseInt(data.silosAbertos, 10)) ? 0 : parseInt(data.silosAbertos, 10)}
              silosCadastrados={isNaN(parseInt(data.silosTotalCadastrados, 10)) ? 0 : parseInt(data.silosTotalCadastrados, 10)}
              silosAbertosNomes={data.silosAbertosNomes}
              culturas={data.culturasEnsiladas}
            />
          </div>
        </div>
      </section>

      {/* Campo — Rebanho + Lavouras + Pastagens */}
      <section aria-label="Campo">
        <SectionLabel>Campo</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
          {/* Coluna Rebanho */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rebanho</p>
            <KpiChartCard
              label="Total de Animais"
              chart={<PieCategoriasRebanho data={data.categoriasRebanho} total={data.totalAnimais} />}
              className="flex-1"
              onClick={() => router.push('/dashboard/rebanho')}
            />
          </div>

          {/* Coluna Lavouras */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lavouras</p>
            <KpiCard
              title="ÁREA TOTAL"
              value={data.talhaoAreaTotal}
              detail="Área cadastrada"
              icon={Map}
              href="/dashboard/talhoes"
            />
            <button
              onClick={() => router.push('/dashboard/talhoes')}
              className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px] flex-1"
            >
              <div className="relative rounded-[13px] border border-border bg-card p-5 flex flex-col gap-3 h-full transition-all duration-300 group-hover:-translate-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.14)]">
                <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#688070]">Culturas Ativas</p>
                {data.culturasAtivas.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Nenhuma cultura ativa</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1">
                    {data.culturasAtivas.map((c) => (
                      <div key={c.name} className="flex items-center justify-between gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-sm font-medium text-[#dceede] truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{c.value} talhão{c.value > 1 ? 'ões' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Coluna Pastagens */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pastagens</p>
            <button
              onClick={() => router.push('/dashboard/pastagens')}
              className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px] flex-1"
            >
              <Card className="rounded-[13px] p-4 md:p-5 h-full transition-all duration-300 group-hover:-translate-y-1">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <p className="uppercase tracking-[0.13em] font-bold text-xs md:text-sm text-[#688070]">Piquetes</p>
                  <div
                    className="shrink-0 p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Leaf className="h-4 w-4 text-[#00c45a]" />
                  </div>
                </div>
                {data.totalPiquetes === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Nenhum piquete cadastrado</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      <span className="text-[#00c45a] underline">Cadastrar pastagem</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Em pastejo</span>
                      <span className="font-semibold text-[#dceede]">{data.piquetesEmPastejo}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Prontos para entrada</span>
                      <span className={`font-semibold ${data.piquetesProntosEntrada > 0 ? 'text-status-success' : 'text-[#dceede]'}`}>
                        {data.piquetesProntosEntrada}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Em reforma</span>
                      <span className="font-semibold text-[#dceede]">{data.piquetesEmReforma}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-[#00c45a] mt-4 group-hover:underline">Ver pastagens →</p>
              </Card>
            </button>
            <button
              onClick={() => router.push('/dashboard/pastagens')}
              className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]"
            >
              <Card className="rounded-[13px] p-4 md:p-5 transition-all duration-300 group-hover:-translate-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="uppercase tracking-[0.13em] font-bold text-xs text-[#688070]">Área de Pastagem</p>
                    {data.pastagensCount === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma pastagem cadastrada</p>
                    ) : (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-xl font-black tracking-tight text-[#dceede]">
                          {data.pastagensAreaTotalHa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha
                        </p>
                        <p className="text-xs text-[#688070]">
                          {data.pastagensCount} sistema{data.pastagensCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className="shrink-0 p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Leaf className="h-4 w-4 text-[#00c45a]" />
                  </div>
                </div>
              </Card>
            </button>
          </div>
        </div>
      </section>

      {/* Financeiro */}
      <section aria-label="Financeiro">
        <SectionLabel>Financeiro</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FinanceiroCard title="RECEITA DO MÊS" value={data.receitaMes} variante="receita" href="/dashboard/financeiro" />
          <FinanceiroCard title="DESPESA DO MÊS" value={data.despesaMes} variante="despesa" href="/dashboard/financeiro" />
          <FinanceiroCard
            title="SALDO LÍQUIDO"
            value={formatBRL(data.receitaMesNum - data.despesaMesNum)}
            variante={data.receitaMesNum - data.despesaMesNum >= 0 ? 'saldo_positivo' : 'saldo_negativo'}
            href="/dashboard/financeiro"
          />
          <FinanceiroCard
            title="SALDO ACUMULADO"
            value={formatBRL(data.saldoAcumuladoNum)}
            variante={data.saldoAcumuladoNum >= 0 ? 'saldo_positivo' : 'saldo_negativo'}
            href="/dashboard/financeiro"
            subtitle="Meses anteriores"
          />
        </div>
      </section>

      {/* Frota */}
      <section aria-label="Frota">
        <SectionLabel>Frota</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard title="MANUTENÇÃO" value={data.maquinasDetalhe} detail="Status das manutenções" icon={Truck} href="/dashboard/frota" />
          <KpiCard title="FROTA" value={data.maquinasTotal} detail="Máquinas cadastradas" icon={AlertTriangle} href="/dashboard/frota" />
        </div>
      </section>

      {/* Atividades Recentes */}
      <section aria-label="Atividades Recentes">
        <Card className="bg-card rounded-2xl p-4 md:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-foreground">Atividades Recentes</h2>
            <Link
              href="/dashboard/calendario"
              className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-2 py-1 transition-colors"
            >
              Ver tudo
            </Link>
          </div>
          <AtividadesRecentesList eventos={data.atividadesRecentes} />
        </Card>
      </section>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 min-h-screen bg-muted/30">
      <div className="space-y-2 mb-8">
        <Skeleton className="h-8 md:h-10 w-56 md:w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 md:h-64 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 md:h-48 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 md:h-28 rounded-2xl" />)}
      </div>
    </div>
  );
}
