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
  Sprout,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const hour = new Date().getHours();
  const greeting = hour >= 12 && hour < 18 ? 'Boa tarde' : (hour >= 18 || hour < 5 ? 'Boa noite' : 'Bom dia');

  const stats = [
    {
      title: 'Capacidade Total Silos',
      value: '0%',
      detail: '0 / 0 ton',
      icon: Database,
      trend: '0%',
      trendUp: null,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      title: 'Área em Cultivo',
      value: '0 ha',
      detail: 'Nenhuma cultura ativa',
      icon: Map,
      trend: 'Estável',
      trendUp: null,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Frota em Operação',
      value: '0 / 0',
      detail: 'Nenhuma máquina cadastrada',
      icon: Truck,
      trend: '0',
      trendUp: null,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Saldo Financeiro',
      value: 'R$ 0,00',
      detail: 'Mês atual',
      icon: DollarSign,
      trend: '0%',
      trendUp: null,
      color: 'text-green-600',
      bg: 'bg-green-50'
    }
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{greeting}, Produtor!</h1>
          <p className="text-gray-500 mt-1">Aqui está o resumo da sua propriedade hoje.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <Calendar className="w-5 h-5 text-green-600 ml-2" />
          <span className="text-sm font-semibold text-gray-700 pr-4">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">{stat.detail}</p>
                {stat.trendUp !== null && (
                  <div className={`flex items-center text-xs font-bold ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {stat.trend}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Atividades Recentes
            </h2>
            <button className="text-sm font-semibold text-green-600 hover:underline">Ver tudo</button>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              <div className="p-10 text-center text-gray-400">
                <p className="text-sm">Nenhuma atividade registrada recentemente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas e Avisos */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas Críticos
          </h2>
          
          <div className="space-y-4">
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Tudo em ordem!</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Não há alertas críticos ou manutenções pendentes para hoje.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
