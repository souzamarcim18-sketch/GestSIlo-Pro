'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import type { ParametrosReprodutivosFazenda } from '@/lib/types/rebanho-reproducao';

interface IndicadoresCardProps {
  taxaPrenhez: number;
  psmMedia: number | null;
  iepMedia: number | null;
  taxaConcepçaoIA: number | null;
  diasEmAberto: { media_dias: number | null; animais_count: number };
  taxaServiço: number | null;
  idadePrimeiraPariçao: number | null;
  contagemPorStatus: {
    vazia: number;
    inseminada: number;
    prenha: number;
    lactacao: number;
    seca: number;
    descartada: number;
  };
  parametros: ParametrosReprodutivosFazenda | null;
}

const COLORS = {
  vazia: '#ef4444',
  inseminada: '#eab308',
  prenha: '#22c55e',
  lactacao: '#3b82f6',
  seca: '#8b5cf6',
  descartada: '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
  vazia: 'Vazia',
  inseminada: 'Inseminada',
  prenha: 'Prenha',
  lactacao: 'Lactando',
  seca: 'Seca',
  descartada: 'Descartada',
};

export function IndicadoresCard({
  taxaPrenhez,
  psmMedia,
  iepMedia,
  taxaConcepçaoIA,
  diasEmAberto,
  taxaServiço,
  idadePrimeiraPariçao,
  contagemPorStatus,
  parametros,
}: IndicadoresCardProps) {
  const metaTaxaPrenhez = parametros?.meta_taxa_prenhez_pct ?? 85;
  const metaPSM = parametros?.meta_psm_dias ?? 90;
  const metaIEP = parametros?.meta_iep_dias ?? 400;
  const metaDiasAberto = parametros?.meta_psm_dias ?? 90;

  const barProgressTaxaPrenhez = useMemo(() => {
    const ratio = taxaPrenhez / metaTaxaPrenhez;
    if (ratio >= 1) return 100;
    if (ratio >= 0.8) return Math.round(ratio * 100);
    return Math.round(ratio * 100);
  }, [taxaPrenhez, metaTaxaPrenhez]);

  const colorTaxaPrenhez = useMemo(() => {
    if (taxaPrenhez >= metaTaxaPrenhez) return 'bg-green-500';
    if (taxaPrenhez >= metaTaxaPrenhez * 0.8) return 'bg-amber-500';
    return 'bg-red-500';
  }, [taxaPrenhez, metaTaxaPrenhez]);

  const psmAbaixaMeta = psmMedia !== null && psmMedia <= metaPSM;
  const iepDentroMeta = iepMedia !== null && iepMedia >= 365 && iepMedia <= 400;

  const pieData = useMemo(() => {
    return Object.entries(contagemPorStatus)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status],
        value: count,
        status,
      }))
      .filter((item) => item.value > 0);
  }, [contagemPorStatus]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Taxa de Prenhez */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">Taxa de Prenhez</p>
              <p className="text-4xl font-bold mt-2">{taxaPrenhez}%</p>
              <p className="text-xs text-muted-foreground mt-1">Meta: {metaTaxaPrenhez}%</p>
            </div>
            <div className="space-y-2">
              <Progress value={barProgressTaxaPrenhez} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {taxaPrenhez >= metaTaxaPrenhez ? '✓ Meta atingida' : '⚠ Abaixo da meta'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: PSM Médio */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">PSM Médio</p>
              <p className="text-4xl font-bold mt-2">{psmMedia !== null ? psmMedia : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Meta: ≤ {metaPSM} dias</p>
            </div>
            <div className="flex items-center gap-2">
              {psmMedia !== null && (
                <>
                  {psmAbaixaMeta ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {psmAbaixaMeta ? '✓ Abaixo da meta' : '⚠ Acima da meta'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: IEP Médio */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">IEP Médio</p>
              <p className="text-4xl font-bold mt-2">{iepMedia !== null ? iepMedia : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Meta: {metaIEP} dias</p>
            </div>
            <div className="flex items-center gap-2">
              {iepMedia !== null && (
                <>
                  {iepDentroMeta ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {iepDentroMeta ? '✓ Na meta' : '⚠ Fora da meta'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Taxa de Concepção IA */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">Taxa de Concepção IA</p>
              <p className="text-4xl font-bold mt-2">{taxaConcepçaoIA !== null ? `${taxaConcepçaoIA}%` : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Diagnósticos positivos após IA</p>
            </div>
            {taxaConcepçaoIA !== null && (
              <p className="text-sm text-muted-foreground">
                {taxaConcepçaoIA >= 50 ? '✓ Bom resultado' : '⚠ Verificar técnica'}
              </p>
            )}
          </div>
        </div>

        {/* Card 5: Dias em Aberto */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">Dias em Aberto</p>
              <p className="text-4xl font-bold mt-2">
                {diasEmAberto.media_dias !== null ? diasEmAberto.media_dias : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {diasEmAberto.animais_count} vaca(s) em lactação
              </p>
            </div>
            {diasEmAberto.media_dias !== null && (
              <p className="text-sm text-muted-foreground">
                {diasEmAberto.media_dias <= metaDiasAberto ? '✓ Abaixo da meta' : '⚠ Acima da meta'}
              </p>
            )}
          </div>
        </div>

        {/* Card 6: Taxa de Serviço */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">Taxa de Serviço</p>
              <p className="text-4xl font-bold mt-2">{taxaServiço !== null ? `${taxaServiço}%` : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Coberturas / fêmeas aptas</p>
            </div>
            {taxaServiço !== null && (
              <p className="text-sm text-muted-foreground">
                {taxaServiço >= 100 ? '✓ Boa cobertura' : '⚠ Verificar'}
              </p>
            )}
          </div>
        </div>

        {/* Card 7: Idade Primeira Parição */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.13em]">Idade Primeira Parição</p>
              <p className="text-4xl font-bold mt-2">
                {idadePrimeiraPariçao !== null ? `${idadePrimeiraPariçao}m` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Idade média em meses</p>
            </div>
            {idadePrimeiraPariçao !== null && (
              <p className="text-sm text-muted-foreground">
                {idadePrimeiraPariçao <= 28 ? '✓ Ideal' : '⚠ Acima da meta'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico Pizza */}
      {pieData.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-[0.13em]">Distribuição por Status Reprodutivo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={`cell-${entry.status}`} fill={COLORS[entry.status as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
