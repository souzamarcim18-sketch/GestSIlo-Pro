'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { GraficoNatalidadeMortalidadeProps } from '@/types/rebanho-indicadores';

const COR_NATAL = '#00A651';
const COR_MORTAL = '#ef4444';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  padding: '10px 14px',
};

const TICK_STYLE = { fill: '#688070', fontSize: 12 };

export function GraficoNatalidadeMortalidade(props: GraficoNatalidadeMortalidadeProps) {
  const { dados } = props;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} barGap={4}>
        <defs>
          <linearGradient id="gradNatal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR_NATAL} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COR_NATAL} stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradMortal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR_MORTAL} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COR_MORTAL} stopOpacity={0.6} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="mes"
          tick={TICK_STYLE}
          axisLine={{ stroke: '#2a4433' }}
          tickLine={false}
        />
        <YAxis
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#222222', opacity: 0.5 }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: 'hsl(var(--foreground))', fontSize: 13 }}>{value}</span>
          )}
        />

        <Bar
          dataKey="natalidade"
          name="Natalidade (%)"
          fill="url(#gradNatal)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
          style={{ filter: `drop-shadow(0 0 6px ${COR_NATAL}50)` }}
          maxBarSize={48}
        />
        <Bar
          dataKey="mortalidade"
          name="Mortalidade (%)"
          fill="url(#gradMortal)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
          style={{ filter: `drop-shadow(0 0 6px ${COR_MORTAL}50)` }}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
