'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  Map,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Calendar,
  Sprout,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GaugeOcupacaoSilos } from '@/components/widgets/GaugeOcupacaoSilos';
import { PieCategoriasRebanho } from '@/components/widgets/PieCategoriasRebanho';
import { PieComposicaoRebanho } from '@/components/widgets/PieComposicaoRebanho';
import { PieCulturasAtivas } from '@/components/widgets/PieCulturasAtivas';
import { KpiChartCard } from '@/components/widgets/KpiChartCard';
import { SilagemMetricasCard } from '@/components/widgets/SilagemMetricasCard';
import { SilosInfoCard } from '@/components/widgets/SilosInfoCard';
import { LotesAtivosCard } from '@/components/widgets/LotesAtivosCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardData, AlertaSeveridade } from './dashboard-data';

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
}: {
  title: string;
  value: string;
  detail: string;
  icon?: React.ElementType;
  href: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]"
    >
      <Card className="rounded-[13px] p-5 h-full transition-all duration-300 group-hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="uppercase tracking-[0.13em] font-bold text-sm text-[#688070]">{title}</p>
            <p className="text-2xl font-black tracking-tight text-[#dceede] truncate">{value}</p>
            <p className="text-sm text-[#688070] truncate">{detail}</p>
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
  const alertShownRef = useRef(false);

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

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#dceede]">
          {greeting}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua propriedade</p>
      </div>

      {/* Silagem */}
      <section aria-label="Silagem">
        <SectionLabel>Silagem</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="row-span-2 flex">
            <KpiChartCard
              label="Ocupação dos Silos"
              sublabel={data.silosGaugeDetalhe || undefined}
              chart={<GaugeOcupacaoSilos percentual={data.silosOcupacaoPctNum} />}
              className="flex-1 min-h-[280px]"
              onClick={() => router.push('/dashboard/silos')}
            />
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
              silosAbertos={parseInt(data.silosAbertos, 10)}
              silosCadastrados={parseInt(data.silosTotalCadastrados, 10)}
              silosAbertosNomes={data.silosAbertosNomes}
              culturas={data.culturasEnsiladas}
            />
          </div>
        </div>
      </section>

      {/* Rebanho */}
      <section aria-label="Rebanho">
        <SectionLabel>Rebanho</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <KpiChartCard
            label="Total de Animais"
            chart={<PieCategoriasRebanho data={data.categoriasRebanho} total={data.totalAnimais} />}
            className="min-h-[240px]"
            onClick={() => router.push('/dashboard/rebanho')}
          />
          <KpiChartCard
            label="Composição do Rebanho"
            chart={<PieComposicaoRebanho data={data.composicaoRebanho} />}
            className="min-h-[240px]"
            onClick={() => router.push('/dashboard/rebanho')}
          />
          <LotesAtivosCard lotes={data.lotesAtivos} />
        </div>
      </section>

      {/* Lavouras */}
      <section aria-label="Lavouras">
        <SectionLabel>Lavouras</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="ÁREA TOTAL" value={data.talhaoAreaTotal} detail="Área cadastrada" icon={Map} href="/dashboard/talhoes" />
          <KpiCard title="EM CULTIVO" value="—" detail="Área plantada" icon={Sprout} href="/dashboard/talhoes" />
          <KpiChartCard
            label="Culturas Ativas"
            chart={<PieCulturasAtivas data={data.culturasAtivas} total={data.culturasAtivas.length} />}
            onClick={() => router.push('/dashboard/talhoes')}
          />
          <KpiCard title="TALHÕES" value={data.talhaoTotalCadastrados} detail="Cadastrados" icon={Map} href="/dashboard/talhoes" />
        </div>
      </section>

      {/* Operações */}
      <section aria-label="Operações">
        <SectionLabel>Operações</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="FROTA" value={data.maquinasTotal} detail="Máquinas cadastradas" icon={Truck} href="/dashboard/frota" />
          <KpiCard title="MANUTENÇÃO" value={data.maquinasDetalhe} detail="Próxima manutenção" icon={AlertTriangle} href="/dashboard/frota" />
          <KpiCard title="RECEITA DO MÊS" value={data.receitaMes} detail="Mês corrente" icon={TrendingUp} href="/dashboard/financeiro" />
          <KpiCard title="DESPESA DO MÊS" value={data.despesaMes} detail="Mês corrente" icon={DollarSign} href="/dashboard/financeiro" />
        </div>
      </section>

      {/* Próximas Operações + Atividades + Alertas */}
      <div className="space-y-6 mt-8">
        <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Próximas Operações</h2>
                <p className="text-xs text-muted-foreground">Próximos 5 dias</p>
              </div>
            </div>
          </div>

          {data.proximasOperacoes.length > 0 ? (
            <div className="space-y-2">
              {data.proximasOperacoes.map((op) => (
                <div
                  key={op.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between text-sm"
                >
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-medium text-foreground min-w-14">
                      {formatarData(op.data_esperada)}
                    </span>
                    <span className="text-muted-foreground">{op.tipo_operacao}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-medium text-foreground">{op.talhao_nome}</span>
                    <span className="text-muted-foreground">({op.cultura})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {op.janelaColheita?.ativo && (
                      <Badge className="bg-status-warning/15 text-status-warning border-status-warning/30 hover:bg-status-warning/20">
                        Janela de colheita
                      </Badge>
                    )}
                    <Badge className={getStatusBadgeColor(op.status)}>{op.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium">Nenhuma operação nos próximos dias</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Operações planejadas aparecem aqui.</p>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card rounded-2xl p-6 shadow-sm lg:col-span-2 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Atividades Recentes</h2>
              <button className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-2 py-1 transition-colors">
                Ver tudo
              </button>
            </div>
            <div className="p-10 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade registrada recentemente.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Suas últimas movimentações aparecerão aqui.</p>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <h2 className="text-lg font-semibold text-foreground mb-4">Alertas Críticos</h2>
              {(() => {
                const alertasOrdenados = [...data.alertas].sort(
                  (a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]
                );
                const alertasExibidos = alertasOrdenados.slice(0, 5);
                const alertasOcultos = alertasOrdenados.length - alertasExibidos.length;

                if (alertasExibidos.length === 0) {
                  return (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 bg-status-success/15 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-7 h-7 text-status-success" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-foreground mb-1">Tudo em ordem!</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Não há alertas críticos ou manutenções pendentes para hoje.
                      </p>
                    </div>
                  );
                }

                return (
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
                    {alertasOcultos > 0 && (
                      <p className="text-xs text-muted-foreground text-right pt-1">
                        +{alertasOcultos} alerta{alertasOcultos > 1 ? 's' : ''} adicional{alertasOcultos > 1 ? 'is' : ''}
                      </p>
                    )}
                  </div>
                );
              })()}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">
      <div className="space-y-2 mb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );
}

function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'planejado': return 'bg-status-info/15 text-status-info border-status-info/30 hover:bg-status-info/20';
    case 'realizado': return 'bg-status-success/15 text-status-success border-status-success/30 hover:bg-status-success/20';
    case 'atrasado': return 'bg-status-danger/15 text-status-danger border-status-danger/30 hover:bg-status-danger/20';
    default: return 'bg-muted text-muted-foreground border-border hover:bg-muted/80';
  }
}

function formatarData(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
