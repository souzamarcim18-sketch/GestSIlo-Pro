'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Map,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFazendaCoordinates } from '@/hooks/useFazendaCoordinates';
import { WeatherWidget } from '@/components/widgets';
import { toast } from 'sonner';
import { getProximasOperacoes } from '@/lib/supabase/talhoes';
import type { ProximaOperacao, CicloAgricola } from '@/lib/types/talhoes';
import { verificarAlertaSilagem } from '@/app/dashboard/talhoes/helpers';

interface DashboardStats {
  silosOcupacao: string;
  silosDetalhe: string;
  talhaoArea: string;
  maquinasTotal: string;
  maquinasDetalhe: string;
  saldoMes: string;
}

interface ProximaOperacaoComBadge extends ProximaOperacao {
  janelaColheita?: { ativo: boolean; diasRestantes: number };
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DashboardPage() {
  const { fazendaId, loading: authLoading, user } = useAuth();
  const { latitude, longitude, location } = useFazendaCoordinates(fazendaId);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [proximasOperacoes, setProximasOperacoes] = useState<ProximaOperacaoComBadge[]>([]);
  const [loadingOperacoes, setLoadingOperacoes] = useState(true);

  // ── Saudação dinâmica ──────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting =
    hour >= 12 && hour < 18
      ? 'Boa tarde'
      : hour >= 18 || hour < 5
        ? 'Boa noite'
        : 'Bom dia';

  // Nome do usuário (pega o primeiro nome para ficar mais pessoal)
  const userName =
    user?.user_metadata?.nome?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'Produtor';


  // ── Fetch de dados ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    const init = async () => {
      setLoading(true);
      try {
        if (!fazendaId) {
          setStats({
            silosOcupacao: '—',
            silosDetalhe: '—',
            talhaoArea: '—',
            maquinasTotal: '—',
            maquinasDetalhe: '—',
            saldoMes: '—',
          });
          return;
        }

        const now = new Date();
        const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];

        const [silosRes, talhoesRes, maquinasRes, manutRes, finRes] =
          await Promise.all([
            supabase
              .from('silos')
              .select('id, volume_ensilado_ton_mv')
              .eq('fazenda_id', fazendaId),
            supabase
              .from('talhoes')
              .select('area_ha')
              .eq('fazenda_id', fazendaId),
            supabase
              .from('maquinas')
              .select('id', { count: 'exact', head: true })
              .eq('fazenda_id', fazendaId),
            supabase
              .from('manutencoes')
              .select('id', { count: 'exact', head: true })
              .eq('fazenda_id', fazendaId)
              .gte('proxima_manutencao', mesInicio),
            supabase
              .from('financeiro')
              .select('tipo, valor')
              .eq('fazenda_id', fazendaId)
              .gte('data', mesInicio)
              .lte('data', mesFim),
          ]);

        // Silos
        const silosData = silosRes.data ?? [];
        let silosOcupacao = '—';
        let silosDetalhe = '—';
        if (silosData.length > 0) {
          const totalVolume = silosData.reduce(
            (acc, s) => acc + (s.volume_ensilado_ton_mv ?? 0),
            0
          );

          // Calcular estoque via movimentações
          const siloIds = silosData.map((s) => s.id);
          const movsRes = siloIds.length > 0
            ? await supabase
                .from('movimentacoes_silo')
                .select('silo_id, tipo, quantidade')
                .in('silo_id', siloIds)
            : { data: [] };

          const movsData = movsRes.data ?? [];
          const estoquePorSilo: Record<string, number> = {};
          for (const mov of movsData) {
            if (!estoquePorSilo[mov.silo_id]) estoquePorSilo[mov.silo_id] = 0;
            estoquePorSilo[mov.silo_id] += mov.tipo === 'Entrada' ? mov.quantidade : -mov.quantidade;
          }

          const totalEstoque = Object.values(estoquePorSilo).reduce(
            (acc, v) => acc + Math.max(v, 0),
            0
          );

          const ocupPct =
            totalVolume > 0
              ? Math.round((totalEstoque / totalVolume) * 100)
              : 0;
          silosOcupacao = `${ocupPct}%`;
          silosDetalhe = `${totalEstoque.toLocaleString('pt-BR')} / ${totalVolume.toLocaleString('pt-BR')} ton`;
        }

        // Talhões
        const talhoesData = talhoesRes.data ?? [];
        let talhaoArea = '—';
        if (talhoesData.length > 0) {
          const totalArea = talhoesData.reduce(
            (acc, t) => acc + (t.area_ha ?? 0),
            0
          );
          talhaoArea = `${totalArea.toLocaleString('pt-BR')} ha`;
        }

        // Máquinas
        const totalMaquinas = maquinasRes.count ?? 0;
        const manutencoesCount = manutRes.count ?? 0;
        let maquinasTotal = '—';
        let maquinasDetalhe = '—';
        if (totalMaquinas > 0) {
          maquinasTotal = `${totalMaquinas}`;
          maquinasDetalhe =
            manutencoesCount > 0
              ? `${manutencoesCount} manutenção(ões) pendente(s)`
              : 'Sem manutenções pendentes';
        }

        // Financeiro
        const finData = finRes.data ?? [];
        let saldoMes = '—';
        if (finData.length > 0) {
          const saldo = finData.reduce((acc, l) => {
            return acc + (l.tipo === 'Receita' ? l.valor : -l.valor);
          }, 0);
          saldoMes = formatBRL(saldo);
        }

        setStats({
          silosOcupacao,
          silosDetalhe,
          talhaoArea,
          maquinasTotal,
          maquinasDetalhe,
          saldoMes,
        });
      } catch {
        toast.error('Erro ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [authLoading, fazendaId]);

  // ── Fetch de próximas operações e alerta de silagem ──────────────────
  useEffect(() => {
    if (!fazendaId) {
      setProximasOperacoes([]);
      setLoadingOperacoes(false);
      return;
    }

    const loadProximasOperacoes = async () => {
      setLoadingOperacoes(true);
      try {
        // Buscar próximas operações
        const operacoes = await getProximasOperacoes(fazendaId);

        // Buscar ciclos ativos para verificar alerta de silagem
        const { data: ciclosData, error: ciclosError } = await supabase
          .from('ciclos_agricolas')
          .select('id, cultura, data_colheita_prevista, data_colheita_real')
          .eq('ativo', true);

        if (ciclosError) throw ciclosError;

        // Verificar alerta de silagem e enriquecer operações
        let alertaSilagemAtivo = false;
        const operacoesEnriquecidas: ProximaOperacaoComBadge[] = operacoes.map((op) => {
          // Verificar se há ciclo correspondente com alerta
          const cicloCorrespondente = (ciclosData || []).find(
            (c: any) =>
              c.data_colheita_prevista === op.data_esperada &&
              c.cultura.includes('Silagem')
          );

          let janelaColheita: { ativo: boolean; diasRestantes: number } | undefined;
          if (cicloCorrespondente) {
            const alerta = verificarAlertaSilagem(cicloCorrespondente as CicloAgricola);
            if (alerta && alerta.ativo && op.tipo_operacao.toLowerCase().includes('colheita')) {
              janelaColheita = alerta;
              alertaSilagemAtivo = true;
            }
          }

          return { ...op, janelaColheita };
        });

        // Exibir toast de alerta uma vez por sessão
        if (alertaSilagemAtivo && !sessionStorage.getItem('alerta_silagem_exibido')) {
          const proximoEvento = operacoesEnriquecidas.find(op => op.janelaColheita?.ativo);
          if (proximoEvento && proximoEvento.janelaColheita) {
            toast.warning(
              `⚠️ Atenção: janela de colheita de ${proximoEvento.cultura} no ${proximoEvento.talhao_nome} se aproxima em ${proximoEvento.janelaColheita.diasRestantes} dias`
            );
            sessionStorage.setItem('alerta_silagem_exibido', 'true');
          }
        }

        // Limitar a 10 itens
        setProximasOperacoes(operacoesEnriquecidas.slice(0, 10));
      } catch (error) {
        console.error('Erro ao carregar próximas operações:', error);
        setProximasOperacoes([]);
      } finally {
        setLoadingOperacoes(false);
      }
    };

    loadProximasOperacoes();
  }, [fazendaId]);

  // ── Cards com navegação ────────────────────────────────────────────
  const statCards = [
    {
      title: 'Capacidade Total Silos',
      value: stats?.silosOcupacao ?? '—',
      detail: stats?.silosDetalhe ?? '—',
      icon: Database,
      iconLabel: 'Ícone de silo',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      href: '/dashboard/silos',
    },
    {
      title: 'Área em Cultivo',
      value: stats?.talhaoArea ?? '—',
      detail: talhoesDetail(stats),
      icon: Map,
      iconLabel: 'Ícone de talhões',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      href: '/dashboard/talhoes',
    },
    {
      title: 'Frota em Operação',
      value: stats?.maquinasTotal ?? '—',
      detail: stats?.maquinasDetalhe ?? '—',
      icon: Truck,
      iconLabel: 'Ícone de frota',
      color: 'text-status-info',
      bg: 'bg-status-info/10',
      href: '/dashboard/frota',
    },
    {
      title: 'Saldo Financeiro',
      value: stats?.saldoMes ?? '—',
      detail: 'Mês atual',
      icon: DollarSign,
      iconLabel: 'Ícone financeiro',
      color: 'text-primary',
      bg: 'bg-primary/10',
      href: '/dashboard/financeiro',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">

      {/* ── Saudação ────────────────────────────────────────────────────── */}
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {greeting}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumo da sua propriedade
        </p>
      </div>

      {/* ── Weather Widget (Full-width) ─────────────────────────────────── */}
      <section aria-labelledby="weather-heading">
        <h2 id="weather-heading" className="sr-only">
          Previsão do tempo
        </h2>
        <WeatherWidget
          latitude={latitude}
          longitude={longitude}
          location={location || 'Sua fazenda'}
        />
      </section>

      {/* ── Stats Grid (Clicáveis) ─────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Indicadores gerais da propriedade
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <button
              key={stat.title}
              onClick={() => router.push(stat.href)}
              className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-sidebar rounded-2xl"
              aria-label={`${stat.title}: ${stat.value}. Clique para ver detalhes.`}
            >
              {index === 0 ? (
                // ── Card destaque (verde) ────────────────────────────────
                <Card className="bg-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    {loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-28 bg-primary-foreground/20" />
                        <Skeleton className="h-4 w-32 bg-primary-foreground/20" />
                      </div>
                    ) : (
                      <>
                        <p className="text-4xl md:text-5xl font-bold text-primary-foreground">
                          {stat.value}
                        </p>
                        <p className="text-sm text-primary-foreground/80">
                          {stat.detail}
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              ) : (
                // ── Card informativo (branco) ────────────────────────────
                <Card className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {stat.title}
                      </p>
                      {loading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-24" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl md:text-4xl font-bold text-foreground">
                            {stat.value}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stat.detail}
                          </p>
                        </>
                      )}
                    </div>
                    <div className={cn("p-3 rounded-xl", stat.bg)}>
                      <stat.icon
                        className={cn("h-5 w-5", stat.color)}
                        aria-label={stat.iconLabel}
                      />
                    </div>
                  </div>
                </Card>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="space-y-6 mt-8">

        {/* Próximas Operações */}
        <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 id="operacoes-heading" className="text-lg font-semibold text-foreground">
                  Próximas Operações
                </h2>
                <p className="text-xs text-muted-foreground">Próximos 5 dias</p>
              </div>
            </div>
          </div>

          {loadingOperacoes ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : proximasOperacoes.length > 0 ? (
            <div className="space-y-2">
              {proximasOperacoes.map((op) => (
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
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        ⚠️ Janela de colheita
                      </Badge>
                    )}
                    <Badge className={getStatusBadgeColor(op.status)}>
                      {op.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium">Nenhuma operação nos próximos dias</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Operações planejadas aparecem aqui.
              </p>
            </div>
          )}
        </Card>

        {/* Grid de Atividades Recentes + Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Atividades Recentes */}
        <Card className="bg-card rounded-2xl p-6 shadow-sm lg:col-span-2 transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="atividades-heading"
              className="text-lg font-semibold text-foreground"
            >
              Atividades Recentes
            </h2>
            <button
              className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1 transition-colors"
              aria-label="Ver todas as atividades recentes"
            >
              Ver tudo
            </button>
          </div>

          <div className="p-10 text-center text-muted-foreground" role="status" aria-live="polite">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">
              Nenhuma atividade registrada recentemente.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Suas últimas movimentações aparecerão aqui.
            </p>
          </div>
        </Card>

        {/* Sidebar Direita: Alertas */}
        <div className="flex flex-col gap-6">
          {/* Alertas Críticos */}
          <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <h2
              id="alertas-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Alertas Críticos
            </h2>

            <div
              className="flex flex-col items-center text-center"
              role="status"
              aria-label="Nenhum alerta crítico: tudo em ordem"
            >
              <div
                className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4"
                aria-hidden="true"
              >
                <CheckCircle2 className="w-7 h-7 text-primary" aria-hidden="true" />
              </div>
              <p className="font-bold text-foreground mb-1">Tudo em ordem!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Não há alertas críticos ou manutenções pendentes para hoje.
              </p>
            </div>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}

function talhoesDetail(stats: DashboardStats | null): string {
  if (!stats || stats.talhaoArea === '—') return 'Nenhuma cultura ativa';
  return 'Área total cadastrada';
}

function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'planejado':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'realizado':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'atrasado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

function formatarData(data: string): string {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
