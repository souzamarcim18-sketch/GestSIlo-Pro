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
  TrendingDown,
  Beef,
  Plus,
  CalendarClock,
  ArrowRight,
  Lock,
  Zap,
} from 'lucide-react';
import { planoPermiteModulo, planoMinimoParaModulo } from '@/lib/planos';
import type { PlanoSlug } from '@/lib/planos';
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
import { EmptyState } from '@/components/ui/EmptyState';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] mb-3 text-foreground">
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
  linkLabel = 'Ver detalhes',
}: {
  title: string;
  value: string;
  detail: string;
  icon?: React.ElementType;
  href: string;
  className?: string;
  linkLabel?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={cn('text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl', className)}
    >
      <Card className="rounded-2xl p-4 md:p-5 h-full transition-all duration-300 group-hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="uppercase tracking-[0.13em] font-bold text-xs md:text-sm text-muted-foreground">{title}</p>
            <p className="text-xl md:text-2xl font-black tracking-tight text-foreground truncate">{value}</p>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{detail}</p>
          </div>
          {Icon && (
            <div className="shrink-0 p-2.5 rounded-xl bg-foreground/[0.07] border border-foreground/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
        {linkLabel && (
          <span className="text-xs text-primary group-hover:underline inline-block pt-2">{linkLabel} →</span>
        )}
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
  variacaoPct,
  variacaoTipo,
  linkLabel,
}: {
  title: string;
  value: string;
  variante: 'receita' | 'despesa' | 'saldo_positivo' | 'saldo_negativo';
  href: string;
  subtitle?: string;
  /** variação % vs mês anterior; null oculta o badge */
  variacaoPct?: number | null;
  /** define se uma variação positiva é "boa" (receita) ou "ruim" (despesa) */
  variacaoTipo?: 'receita' | 'despesa';
  /** quando presente, exibe um link "ver detalhes" no rodapé do card */
  linkLabel?: string;
}) {
  const router = useRouter();
  const valueColor =
    variante === 'receita'
      ? 'text-status-success'
      : variante === 'despesa'
        ? 'text-status-danger'
        : variante === 'saldo_positivo'
          ? 'text-status-success'
          : 'text-status-danger';

  // Para receita, subir é bom (verde); para despesa, subir é ruim (vermelho).
  const variacaoBom =
    variacaoPct != null && (variacaoTipo === 'despesa' ? variacaoPct <= 0 : variacaoPct >= 0);
  const VariacaoIcon = variacaoPct != null && variacaoPct >= 0 ? TrendingUp : TrendingDown;

  return (
    <button
      onClick={() => router.push(href)}
      className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="rounded-2xl p-4 h-full transition-all duration-300 group-hover:-translate-y-1">
        <div className="space-y-1.5">
          <p className="uppercase tracking-[0.13em] font-bold text-xs text-muted-foreground">{title}</p>
          <p className={cn('text-xl md:text-2xl font-black tracking-tight truncate', valueColor)}>{value}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {variacaoPct != null && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold',
                  variacaoBom ? 'text-status-success' : 'text-status-danger'
                )}
              >
                <VariacaoIcon className="w-3 h-3" aria-hidden="true" />
                {Math.abs(variacaoPct)}%
              </span>
            )}
          </div>
          {linkLabel && (
            <span className="text-xs text-primary group-hover:underline inline-block pt-0.5">{linkLabel} →</span>
          )}
        </div>
      </Card>
    </button>
  );
}

const PLANO_LABEL: Record<PlanoSlug, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
};

// Rótulo + ícone amigável de cada módulo bloqueável (para o card de upgrade).
const MODULO_INFO: Record<string, { label: string; Icon: React.ElementType }> = {
  financeiro: { label: 'Financeiro', Icon: DollarSign },
  rebanho: { label: 'Rebanho', Icon: Beef },
  talhoes: { label: 'Lavouras', Icon: Map },
  pastagens: { label: 'Pastagens', Icon: Leaf },
  frota: { label: 'Frota & Maquinário', Icon: Truck },
};

/**
 * Card sólido e discreto exibido no lugar do conteúdo de um módulo não incluído no plano atual.
 * Sem blur, sem dados borrados vazando, sem preços repetidos — só o essencial e um único CTA.
 * Preenche a altura do contêiner (`h-full`) para alinhar com cards vizinhos no grid.
 */
function LockedModuleCard({ modulo, className }: { modulo: string; className?: string }) {
  const router = useRouter();
  const planoMinimo = planoMinimoParaModulo(modulo);
  const info = MODULO_INFO[modulo] ?? { label: modulo, Icon: Lock };
  const Icon = info.Icon;

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center text-center gap-4 p-6 min-h-[180px] h-full',
        className
      )}
    >
      <div className="relative">
        <div className="p-3 rounded-xl bg-foreground/[0.05] border border-foreground/10">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-card border border-border">
          <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground leading-tight">{info.label}</p>
        <p className="text-xs text-muted-foreground">
          Disponível no plano{' '}
          <span className="font-semibold text-primary">
            {planoMinimo ? PLANO_LABEL[planoMinimo] : 'Starter'}
          </span>
        </p>
      </div>

      <button
        onClick={() => router.push('/dashboard/configuracoes/plano')}
        className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg text-white transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ background: 'linear-gradient(135deg, #00843D 0%, #00c45a 100%)' }}
      >
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        Fazer upgrade
      </button>
    </div>
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

// Cabeçalho do banner: reflete a MAIOR severidade presente (não fica sempre vermelho).
const BANNER_CONFIG: Record<AlertaSeveridade, {
  titulo: string;
  Icon: React.ElementType;
  textClass: string;
  borderClass: string;
}> = {
  critico: { titulo: 'Alertas Críticos', Icon: AlertCircle,   textClass: 'text-status-danger',  borderClass: 'border-status-danger/20'  },
  urgente: { titulo: 'Pontos de Atenção', Icon: AlertTriangle, textClass: 'text-status-warning', borderClass: 'border-status-warning/20' },
  aviso:   { titulo: 'Avisos',            Icon: Info,          textClass: 'text-status-info',    borderClass: 'border-status-info/20'    },
};

export function DashboardClient({ data, userName }: { data: DashboardData; userName: string }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const planoAtual = data.planoAtual;
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
  // Maior severidade presente define o tom do banner (já ordenado: crítico → urgente → aviso)
  const banner = BANNER_CONFIG[alertasOrdenados[0]?.severidade ?? 'aviso'];

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
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
          {greeting}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua propriedade</p>
      </div>

      {/* Alertas Críticos — banner condicional no topo */}
      {alertasExibidos.length > 0 && (
        <Card className={cn('bg-card rounded-2xl p-4 md:p-5 shadow-sm border', banner.borderClass)}>
          <div className="flex items-center gap-2 mb-3">
            <banner.Icon className={cn('w-4 h-4 shrink-0', banner.textClass)} aria-hidden="true" />
            <h2 className={cn('text-sm font-bold uppercase tracking-[0.13em]', banner.textClass)}>
              {banner.titulo}
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
              className="text-left group w-full flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
            >
              <div className="relative rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full transition-all duration-300 group-hover:-translate-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.14)]">
                <p className="text-sm font-bold uppercase tracking-[0.13em] text-muted-foreground">Ocupação dos Silos</p>
                {/* Gauge centralizado */}
                <div className="flex justify-center">
                  <GaugeOcupacaoSilos percentual={data.silosOcupacaoPctNum} />
                </div>
                {/* Estoque abaixo do gauge */}
                <div className="text-center -mt-2">
                  <p className="text-base font-bold tracking-tight text-foreground">{data.silosGaugeDetalhe}</p>
                  <p className="text-xs text-muted-foreground">estoque atual</p>
                </div>
                {/* Barras de silos ocupando largura total */}
                {data.silosAbertosNomes.length > 0 ? (
                  <div className="space-y-2 w-full">
                    {data.silosAbertosNomes.map((nome) => (
                      <div key={nome} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{nome}</span>
                          <span className="text-xs font-semibold text-foreground ml-2">{data.silosOcupacaoPctNum}%</span>
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
                <span className="text-xs text-primary group-hover:underline inline-block">Ver detalhes →</span>
              </div>
            </button>
          </div>
          <div className="row-span-2 flex">
            <SilagemMetricasCard
              autonomia={data.silosAutonomiaDias}
              consumo={data.silosConsumoDiario}
              taxaPerdas={data.silosTaxaPerdas}
              consumoSparkline={data.consumoSparkline}
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

      {/* Financeiro — elevado logo após Silagem por impacto na decisão do produtor */}
      <section aria-label="Financeiro">
        <SectionLabel>Financeiro</SectionLabel>
        {!planoPermiteModulo(planoAtual, 'financeiro') ? (
          <LockedModuleCard modulo="financeiro" className="min-h-[140px]" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FinanceiroCard
              title="RECEITA DO MÊS"
              value={data.receitaMes}
              variante="receita"
              href="/dashboard/financeiro"
              variacaoPct={data.receitaVariacaoPct}
              variacaoTipo="receita"
              linkLabel="Ver detalhes"
            />
            <FinanceiroCard
              title="DESPESA DO MÊS"
              value={data.despesaMes}
              variante="despesa"
              href="/dashboard/financeiro"
              variacaoPct={data.despesaVariacaoPct}
              variacaoTipo="despesa"
              linkLabel="Ver detalhes"
            />
            <FinanceiroCard
              title="SALDO LÍQUIDO"
              value={formatBRL(data.receitaMesNum - data.despesaMesNum)}
              variante={data.receitaMesNum - data.despesaMesNum >= 0 ? 'saldo_positivo' : 'saldo_negativo'}
              href="/dashboard/financeiro"
              linkLabel="Ver detalhes"
            />
            <FinanceiroCard
              title="SALDO ACUMULADO"
              value={formatBRL(data.saldoAcumuladoNum)}
              variante={data.saldoAcumuladoNum >= 0 ? 'saldo_positivo' : 'saldo_negativo'}
              href="/dashboard/financeiro"
              subtitle="Total até hoje"
              linkLabel="Ver detalhes"
            />
          </div>
        )}
      </section>

      {/* Próximas Operações — só renderiza quando há operações de campo agendadas */}
      {data.proximasOperacoes.length > 0 && (
        <section aria-label="Próximas Operações">
          <SectionLabel>Próximas Operações</SectionLabel>
          <Card className="rounded-2xl p-4 md:p-5">
            <div className="space-y-2">
              {data.proximasOperacoes.slice(0, 5).map((op) => {
                const janelaAtiva = op.janelaColheita?.ativo;
                return (
                  <button
                    key={op.id}
                    onClick={() => router.push('/dashboard/talhoes')}
                    className="w-full text-left p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                      <CalendarClock className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">
                        {op.tipo_operacao}
                        {op.cultura ? ` — ${op.cultura}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {op.talhao_nome}
                        {op.data_esperada
                          ? ` · ${new Date(op.data_esperada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                          : ''}
                      </p>
                    </div>
                    {janelaAtiva && (
                      <span className="shrink-0 text-xs font-semibold text-status-warning bg-status-warning/10 rounded-full px-2 py-0.5">
                        Janela em {op.janelaColheita!.diasRestantes}d
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* Campo — Rebanho + Lavouras + Pastagens */}
      <section aria-label="Campo">
        <SectionLabel>Campo</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
          {/* Coluna Rebanho */}
          {!planoPermiteModulo(planoAtual, 'rebanho') ? (
            <LockedModuleCard modulo="rebanho" />
          ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rebanho</p>
            {data.totalAnimais === 0 ? (
              <Card className="rounded-2xl p-2 flex-1 flex items-center justify-center">
                <EmptyState
                  icon={<Beef className="w-12 h-12" />}
                  title="Nenhum animal cadastrado"
                  description="Comece a registrar seu rebanho para acompanhar indicadores e movimentações."
                  action={
                    <Link
                      href="/dashboard/rebanho"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-2 py-1"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Cadastrar rebanho
                    </Link>
                  }
                />
              </Card>
            ) : (
              <KpiChartCard
                label="Total de Animais"
                chart={<PieCategoriasRebanho data={data.categoriasRebanho} total={data.totalAnimais} />}
                className="flex-1"
                onClick={() => router.push('/dashboard/rebanho')}
                linkLabel="Ver detalhes"
              />
            )}
          </div>
          )}

          {/* Coluna Lavouras */}
          {!planoPermiteModulo(planoAtual, 'talhoes') ? (
            <LockedModuleCard modulo="talhoes" />
          ) : (
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
              className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl flex-1"
            >
              <div className="relative rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 h-full transition-all duration-300 group-hover:-translate-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.14)]">
                <p className="text-sm font-bold uppercase tracking-[0.13em] text-muted-foreground">Culturas Ativas</p>
                {data.culturasAtivas.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Nenhuma cultura ativa</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1">
                    {data.culturasAtivas.map((c) => (
                      <div key={c.name} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-foreground/[0.04]">
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{c.value} talhão{c.value > 1 ? 'ões' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
                <span className="text-xs text-primary group-hover:underline inline-block">Ver detalhes →</span>
              </div>
            </button>
          </div>
          )}

          {/* Coluna Pastagens */}
          {!planoPermiteModulo(planoAtual, 'pastagens') ? (
            <LockedModuleCard modulo="pastagens" />
          ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pastagens</p>
            <button
              onClick={() => router.push('/dashboard/pastagens')}
              className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl flex-1"
            >
              <Card className="rounded-2xl p-4 md:p-5 h-full transition-all duration-300 group-hover:-translate-y-1">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <p className="uppercase tracking-[0.13em] font-bold text-xs md:text-sm text-muted-foreground">Piquetes</p>
                  <div
                    className="shrink-0 p-2.5 rounded-xl bg-foreground/[0.07] border border-foreground/10"
                  >
                    <Leaf className="h-4 w-4 text-primary" />
                  </div>
                </div>
                {data.totalPiquetes === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Nenhum piquete cadastrado</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      <span className="text-primary underline">Cadastrar pastagem</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Em pastejo</span>
                      <span className="font-semibold text-foreground">{data.piquetesEmPastejo}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Prontos para entrada</span>
                      <span className={`font-semibold ${data.piquetesProntosEntrada > 0 ? 'text-status-success' : 'text-foreground'}`}>
                        {data.piquetesProntosEntrada}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Em reforma</span>
                      <span className="font-semibold text-foreground">{data.piquetesEmReforma}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-primary mt-4 group-hover:underline">Ver detalhes →</p>
              </Card>
            </button>
            <button
              onClick={() => router.push('/dashboard/pastagens')}
              className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
            >
              <Card className="rounded-2xl p-4 md:p-5 transition-all duration-300 group-hover:-translate-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="uppercase tracking-[0.13em] font-bold text-xs text-muted-foreground">Área de Pastagem</p>
                    {data.pastagensCount === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma pastagem cadastrada</p>
                    ) : (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-xl font-black tracking-tight text-foreground">
                          {data.pastagensAreaTotalHa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.pastagensCount} sistema{data.pastagensCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className="shrink-0 p-2.5 rounded-xl bg-foreground/[0.07] border border-foreground/10"
                  >
                    <Leaf className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <span className="text-xs text-primary group-hover:underline inline-block pt-2">Ver detalhes →</span>
              </Card>
            </button>
          </div>
          )}
        </div>
      </section>

      {/* Atividades Recentes — faixa fina quando vazio, bloco completo quando há dados */}
      <section aria-label="Atividades Recentes">
        {data.atividadesRecentes.length === 0 ? (
          <Link
            href="/dashboard/calendario"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-muted-foreground/50 shrink-0" aria-hidden="true" />
              <span className="text-sm text-muted-foreground truncate">
                Nenhuma atividade recente — suas movimentações aparecerão aqui.
              </span>
            </div>
            <span className="text-sm font-semibold text-brand-primary shrink-0">Ver tudo →</span>
          </Link>
        ) : (
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
        )}
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
