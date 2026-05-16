'use client';

import { type SiloCardData } from '../helpers';

interface Props {
  data: SiloCardData[];
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

export function SiloKpiStrip({ data }: Props) {
  if (data.length === 0) return null;

  const total = data.length;
  const abertos = data.filter((d) => d.status === 'Aberto').length;
  const criticos = data.filter((d) => d.status === 'Crítico' || d.status === 'Esgotado').length;

  const ocupacoesValidas = data
    .map((d) => {
      const cap = d.silo.volume_ensilado_ton_mv ?? 0;
      if (cap === 0) return null;
      return Math.min(Math.round((d.estoque / cap) * 100), 100);
    })
    .filter((v): v is number => v !== null);

  const ocupacaoMedia =
    ocupacoesValidas.length > 0
      ? Math.round(ocupacoesValidas.reduce((a, b) => a + b, 0) / ocupacoesValidas.length)
      : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden w-full">
      <KpiItem label="Total de Silos" value={total} />
      <KpiItem
        label="Ocupação Média"
        value={ocupacaoMedia !== null ? `${ocupacaoMedia}%` : '—'}
        sub={`${ocupacoesValidas.length} silo${ocupacoesValidas.length !== 1 ? 's' : ''} com dados`}
      />
      <KpiItem label="Abertos" value={abertos} sub="em uso" />
      <KpiItem
        label="Críticos"
        value={criticos}
        sub={criticos > 0 ? 'atenção necessária' : 'todos OK'}
      />
    </div>
  );
}
