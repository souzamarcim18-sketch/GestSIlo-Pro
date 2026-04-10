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
  Calendar,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DashboardStats {
  silosOcupacao: string;
  silosDetalhe: string;
  talhaoArea: string;
  maquinasTotal: string;
  maquinasDetalhe: string;
  saldoMes: string;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DashboardPage() {
  const { fazendaId, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
              .select('capacidade, estoque_atual')
              .eq('fazenda_id', fazendaId),
            supabase
              .from('talhoes')
              .select('area')
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
          const totalCapacidade = silosData.reduce(
            (acc, s) => acc + (s.capacidade ?? 0),
            0
          );
          const totalEstoque = silosData.reduce(
            (acc, s) => acc + (s.estoque_atual ?? 0),
            0
          );
          const ocupPct =
            totalCapacidade > 0
              ? Math.round((totalEstoque / totalCapacidade) * 100)
              : 0;
          silosOcupacao = `${ocupPct}%`;
          silosDetalhe = `${totalEstoque.toLocaleString('pt-BR')} / ${totalCapacidade.toLocaleString('pt-BR')} ton`;
        }

        // Talhões
        const talhoesData = talhoesRes.data ?? [];
        let talhaoArea = '—';
        if (talhoesData.length > 0) {
          const totalArea = talhoesData.reduce(
            (acc, t) => acc + (t.area ?? 0),
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

  // ── Cards com navegação ────────────────────────────────────────────
  const statCards = [
    {
      title: 'Capacidade Total Silos',
      value: stats?.silosOcupacao ?? '—',
      detail: stats?.silosDetalhe ?? '—',
      icon: Database,
      iconLabel: 'Ícone de silo',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      borderColor: 'border-l-amber-500',
      href: '/dashboard/silos',
    },
    {
      title: 'Área em Cultivo',
      value: stats?.talhaoArea ?? '—',
      detail: talhoesDetail(stats),
      icon: Map,
      iconLabel: 'Ícone de talhões',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      borderColor: 'border-l-emerald-500',
      href: '/dashboard/talhoes',
    },
    {
      title: 'Frota em Operação',
      value: stats?.maquinasTotal ?? '—',
      detail: stats?.maquinasDetalhe ?? '—',
      icon: Truck,
      iconLabel: 'Ícone de frota',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      borderColor: 'border-l-blue-500',
      href: '/dashboard/frota',
    },
    {
      title: 'Saldo Financeiro',
      value: stats?.saldoMes ?? '—',
      detail: 'Mês atual',
      icon: DollarSign,
      iconLabel: 'Ícone financeiro',
      color: 'text-green-600',
      bg: 'bg-green-50',
      borderColor: 'border-l-green-500',
      href: '/dashboard/financeiro',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            {greeting}, <span className="text-green-700">{userName}</span>!
          </h1>
          <p className="text-gray-500 mt-2 text-base">
            Aqui está o resumo da sua propriedade hoje.
          </p>
        </div>

        <div
          className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100"
          aria-label={`Data de hoje: ${today}`}
        >
          <Calendar className="w-5 h-5 text-green-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-700">
            {today}
          </span>
        </div>
      </div>

      {/* ── Stats Grid (Clicáveis) ─────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Indicadores gerais da propriedade
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat) => (
            <button
              key={stat.title}
              onClick={() => router.push(stat.href)}
              className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 rounded-2xl"
              aria-label={`${stat.title}: ${stat.value}. Clique para ver detalhes.`}
            >
              <Card
                className={`
                  border-none border-l-4 ${stat.borderColor}
                  shadow-sm rounded-2xl
                  transition-all duration-200 ease-out
                  group-hover:shadow-lg group-hover:scale-[1.02] group-hover:-translate-y-0.5
                  cursor-pointer h-full
                `}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                    {stat.title}
                  </h3>
                  <div className={`p-2 rounded-xl ${stat.bg}`} aria-hidden="true">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                  </div>
                </CardHeader>

                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">{stat.detail}</p>
                        <ChevronRight
                          className="w-4 h-4 text-gray-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all"
                          aria-hidden="true"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Atividades Recentes */}
        <section
          className="lg:col-span-2 space-y-5"
          aria-labelledby="atividades-heading"
        >
          <div className="flex items-center justify-between">
            <h2
              id="atividades-heading"
              className="text-xl font-bold text-gray-900 flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5 text-green-600" aria-hidden="true" />
              Atividades Recentes
            </h2>
            <button
              className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded px-2 py-1 transition-colors"
              aria-label="Ver todas as atividades recentes"
            >
              Ver tudo
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-10 text-center text-gray-400" role="status" aria-live="polite">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-200" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-500">
                Nenhuma atividade registrada recentemente.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Suas últimas movimentações aparecerão aqui.
              </p>
            </div>
          </div>
        </section>

        {/* Alertas Críticos */}
        <section className="space-y-5" aria-labelledby="alertas-heading">
          <h2
            id="alertas-heading"
            className="text-xl font-bold text-gray-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
            Alertas Críticos
          </h2>

          <div className="space-y-4">
            <div
              className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center"
              role="status"
              aria-label="Nenhum alerta crítico: tudo em ordem"
            >
              <div
                className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4"
                aria-hidden="true"
              >
                <CheckCircle2 className="w-7 h-7 text-green-600" aria-hidden="true" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Tudo em ordem!</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Não há alertas críticos ou manutenções pendentes para hoje.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function talhoesDetail(stats: DashboardStats | null): string {
  if (!stats || stats.talhaoArea === '—') return 'Nenhuma cultura ativa';
  return 'Área total cadastrada';
}
