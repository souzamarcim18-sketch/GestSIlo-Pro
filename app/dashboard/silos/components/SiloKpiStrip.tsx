'use client';

import { Database, Gauge, DoorOpen, AlertTriangle, Layers, CalendarClock, TrendingDown, Percent } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { type SiloCardData, type ResumoFrotaSilos } from '../helpers';

interface Props {
  data: SiloCardData[];
  resumo?: ResumoFrotaSilos;
}

const formatTon = (v: number) =>
  `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;

export function SiloKpiStrip({ data, resumo }: Props) {
  if (data.length === 0) return null;

  const total = data.length;
  const abertos = data.filter((d) => d.status === 'Aberto').length;
  const criticos = data.filter((d) => d.status === 'Crítico' || d.status === 'Esgotado').length;

  // Ocupação agregada da frota: estoque total ÷ volume total (mesma metodologia do gauge do dashboard).
  const silosComVolume = data.filter((d) => (d.silo.volume_ensilado_ton_mv ?? 0) > 0);
  const volumeTotal = silosComVolume.reduce((acc, d) => acc + (d.silo.volume_ensilado_ton_mv ?? 0), 0);
  const estoqueTotalComVolume = silosComVolume.reduce((acc, d) => acc + Math.max(d.estoque, 0), 0);

  const ocupacaoMedia =
    volumeTotal > 0 ? Math.min(Math.round((estoqueTotalComVolume / volumeTotal) * 100), 100) : null;
  const silosComDados = silosComVolume.length;

  const autonomiaLabel =
    resumo && resumo.autonomiaDias !== null
      ? resumo.autonomiaDias > 365
        ? 'Mais de 1 ano'
        : `${resumo.autonomiaDias} dias`
      : '—';

  const consumoLabel =
    resumo && resumo.consumoDiarioFrota !== null
      ? `${formatTon(resumo.consumoDiarioFrota)}/dia`
      : '—';

  const perdasLabel =
    resumo && resumo.taxaPerdas !== null ? `${resumo.taxaPerdas.toFixed(1)}%` : '—';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <KpiCard
        label="Total de Silos"
        valor={total}
        icon={<Database className="h-5 w-5" />}
      />
      <KpiCard
        label="Ocupação Média"
        valor={ocupacaoMedia !== null ? `${ocupacaoMedia}%` : '—'}
        sublabel={`${silosComDados} silo${silosComDados !== 1 ? 's' : ''} com dados`}
        icon={<Gauge className="h-5 w-5" />}
      />
      <KpiCard
        label="Abertos"
        valor={abertos}
        sublabel="em uso"
        icon={<DoorOpen className="h-5 w-5" />}
      />
      <KpiCard
        label="Críticos"
        valor={criticos}
        sublabel={criticos > 0 ? 'atenção necessária' : 'todos OK'}
        icon={<AlertTriangle className="h-5 w-5" />}
      />
      <KpiCard
        label="Estoque Total"
        valor={resumo ? formatTon(resumo.estoqueTotal) : '—'}
        sublabel="somatório dos silos"
        icon={<Layers className="h-5 w-5" />}
      />
      <KpiCard
        label="Autonomia Estimada"
        valor={autonomiaLabel}
        sublabel={resumo && resumo.consumoDiarioFrota !== null ? 'todos os silos' : 'sem consumo'}
        icon={<CalendarClock className="h-5 w-5" />}
      />
      <KpiCard
        label="Consumo Médio"
        valor={consumoLabel}
        sublabel={resumo && resumo.consumoDiarioFrota !== null ? 'silos abertos' : 'nenhum aberto'}
        icon={<TrendingDown className="h-5 w-5" />}
      />
      <KpiCard
        label="Perdas"
        valor={perdasLabel}
        icon={<Percent className="h-5 w-5" />}
      />
    </div>
  );
}
