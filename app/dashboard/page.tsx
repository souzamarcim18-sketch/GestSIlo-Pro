'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Map,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const hour = new Date().getHours();
  const greeting =
    hour >= 12 && hour < 18
      ? 'Boa tarde'
      : hour >= 18 || hour < 5
      ? 'Boa noite'
      : 'Bom dia';

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('fazenda_id')
          .eq('id', user.id)
          .single();

        const fazendaId = profile?.fazenda_id;
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
  }, []);

  const statCards = [
    {
      title: 'Capacidade Total Silos',
      value: stats?.silosOcupacao ?? '—',
      detail: stats?.silosDetalhe ?? '—',
      icon: Database,
      iconLabel: 'Ícone de banco de dados',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Área em Cultivo',
      value: stats?.talhaoArea ?? '—',
      detail: talhoesDetail(stats),
      icon: Map,
      iconLabel: 'Ícone de mapa',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Frota em Operação',
      value: stats?.maquinasTotal ?? '—',
      detail: stats?.maquinasDetalhe ?? '—',
      icon: Truck,
      iconLabel: 'Ícone de caminhão',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Saldo Financeiro',
      value: stats?.saldoMes ?? '—',
      detail: 'Mês atual',
      icon: DollarSign,
      iconLabel: 'Ícone de cifrão',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting}, Produtor!
          </h1>
          <p className="text-gray-600 mt-1">
            Aqui está o resumo da sua propriedade hoje.
          </p>
        </div>

        <div
          className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100"
          aria-label={`Data de hoje: ${today}`}
        >
          <Calendar className="w-5 h-5 text-green-600 ml-2" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-700 pr-4">
            {today}
          </span>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Indicadores gerais da propriedade
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className="border-none shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <h3 className="text-sm font-medium text-gray-600">
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
                    <div
                      className="text-2xl font-bold text-gray-900"
                      aria-label={`${stat.title}: ${stat.value}`}
                    >
                      {stat.value}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stat.detail}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Atividades Recentes */}
        <section
          className="lg:col-span-2 space-y-6"
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
              className="text-sm font-semibold text-green-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
              aria-label="Ver todas as atividades recentes"
            >
              Ver tudo
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              <div
                className="p-10 text-center text-gray-500"
                role="status"
                aria-live="polite"
                aria-label="Nenhuma atividade registrada recentemente"
              >
                <p className="text-sm">
                  Nenhuma atividade registrada recentemente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Alertas Críticos */}
        <section
          className="space-y-6"
          aria-labelledby="alertas-heading"
        >
          <h2
            id="alertas-heading"
            className="text-xl font-bold text-gray-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
            Alertas Críticos
          </h2>

          <div className="space-y-4">
            <div
              className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center"
              role="status"
              aria-label="Nenhum alerta crítico: tudo em ordem"
            >
              <div
                className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4"
                aria-hidden="true"
              >
                <CheckCircle2 className="w-8 h-8 text-green-600" aria-hidden="true" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Tudo em ordem!</p>
              <p className="text-xs text-gray-600 leading-relaxed">
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
