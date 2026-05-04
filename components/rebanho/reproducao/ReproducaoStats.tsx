'use client';

import { useMemo } from 'react';
import { Activity, Heart, CheckCircle, Baby } from 'lucide-react';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';

interface ReproducaoStatsProps {
  eventos: EventoReprodutivo[];
}

export function ReproducaoStats({ eventos }: ReproducaoStatsProps) {
  const stats = useMemo(() => {
    const total = eventos.length;
    const coberturas = eventos.filter((e) => e.tipo === 'cobertura').length;
    const diagnosticosPositivos = eventos.filter(
      (e) => e.tipo === 'diagnostico_prenhez' && e.resultado_prenhez === 'positivo'
    ).length;
    const partos = eventos.filter((e) => e.tipo === 'parto').length;

    return { total, coberturas, diagnosticosPositivos, partos };
  }, [eventos]);

  const cards = [
    {
      label: 'Total de Eventos',
      value: stats.total,
      icon: Activity,
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Coberturas',
      value: stats.coberturas,
      icon: Heart,
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Diagnósticos +',
      value: stats.diagnosticosPositivos,
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Partos',
      value: stats.partos,
      icon: Baby,
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`${card.bgColor} rounded-lg p-4 border border-border/40`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${card.iconColor} flex-shrink-0`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
