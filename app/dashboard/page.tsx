'use client';

import {
  Database,
  Map,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardPage() {
  const hour = new Date().getHours();
  const greeting =
    hour >= 12 && hour < 18
      ? 'Boa tarde'
      : hour >= 18 || hour < 5
      ? 'Boa noite'
      : 'Bom dia';

  const stats = [
    {
      title: 'Capacidade Total Silos',
      value: '0%',
      detail: '0 / 0 ton',
      icon: Database,
      iconLabel: 'Ícone de banco de dados',
      trend: '0%',
      trendUp: null as boolean | null,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Área em Cultivo',
      value: '0 ha',
      detail: 'Nenhuma cultura ativa',
      icon: Map,
      iconLabel: 'Ícone de mapa',
      trend: 'Estável',
      trendUp: null as boolean | null,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Frota em Operação',
      value: '0 / 0',
      detail: 'Nenhuma máquina cadastrada',
      icon: Truck,
      iconLabel: 'Ícone de caminhão',
      trend: '0',
      trendUp: null as boolean | null,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Saldo Financeiro',
      value: 'R$ 0,00',
      detail: 'Mês atual',
      icon: DollarSign,
      iconLabel: 'Ícone de cifrão',
      trend: '0%',
      trendUp: null as boolean | null,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* h1 real da página — o layout não fornece um, então fica aqui */}
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting}, Produtor!
          </h1>
          <p className="text-gray-600 mt-1">
            Aqui está o resumo da sua propriedade hoje.
          </p>
        </div>

        {/* Data atual — puramente informativo, não é nav */}
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
          {stats.map((stat) => {
            const trendLabel =
              stat.trendUp === true
                ? `Tendência de alta: ${stat.trend}`
                : stat.trendUp === false
                ? `Tendência de baixa: ${stat.trend}`
                : undefined;

            return (
              <Card
                key={stat.title}
                className="border-none shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  {/* Título do card como h3 — dentro de section h2, hierarquia correta */}
                  <h3 className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </h3>
                  <div className={`p-2 rounded-xl ${stat.bg}`} aria-hidden="true">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                  </div>
                </CardHeader>

                <CardContent>
                  {/*
                    aria-label une título + valor para leitores de tela:
                    ex.: "Capacidade Total Silos: 0%"
                  */}
                  <div
                    className="text-2xl font-bold text-gray-900"
                    aria-label={`${stat.title}: ${stat.value}`}
                  >
                    {stat.value}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">{stat.detail}</p>

                    {stat.trendUp !== null && trendLabel && (
                      <div
                        className={`flex items-center text-xs font-bold ${
                          stat.trendUp ? 'text-green-600' : 'text-red-600'
                        }`}
                        aria-label={trendLabel}
                      >
                        {stat.trendUp ? (
                          <ArrowUpRight className="w-3 h-3 mr-1" aria-hidden="true" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-1" aria-hidden="true" />
                        )}
                        <span aria-hidden="true">{stat.trend}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              {/* Estado vazio */}
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
