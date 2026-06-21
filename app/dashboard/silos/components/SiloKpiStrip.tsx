'use client';

import { type SiloCardData, type ResumoFrotaSilos } from '../helpers';

interface Props {
  data: SiloCardData[];
  resumo?: ResumoFrotaSilos;
}

function KpiItem({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-5 py-4 text-center md:border-r md:border-border/40 md:last:border-r-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
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
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/40">
        <KpiItem label="Total de Silos" value={total} />
        <KpiItem
          label="Ocupação Média"
          value={ocupacaoMedia !== null ? `${ocupacaoMedia}%` : '—'}
          sub={`${silosComDados} silo${silosComDados !== 1 ? 's' : ''} com dados`}
        />
        <KpiItem label="Abertos" value={abertos} sub="em uso" />
        <KpiItem
          label="Críticos"
          value={criticos}
          sub={criticos > 0 ? 'atenção necessária' : 'todos OK'}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        <KpiItem
          label="Estoque Total"
          value={resumo ? formatTon(resumo.estoqueTotal) : '—'}
          sub="somatório dos silos"
        />
        <KpiItem
          label="Autonomia Estimada"
          value={autonomiaLabel}
          sub={resumo && resumo.consumoDiarioFrota !== null ? 'frota completa' : 'sem consumo'}
        />
        <KpiItem
          label="Consumo Médio"
          value={consumoLabel}
          sub={resumo && resumo.consumoDiarioFrota !== null ? 'silos abertos' : 'nenhum aberto'}
        />
        <KpiItem
          label="Perdas"
          value={perdasLabel}
          sub="descarte ÷ saídas"
        />
      </div>
    </div>
  );
}
