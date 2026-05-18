'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { GraficoDistribuicaoEtariaProps } from '@/types/rebanho-indicadores';

const CORES = [
  '#00A651', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

import type { PieLabelRenderProps } from 'recharts';

function CustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (
    cx === undefined || cy === undefined ||
    midAngle === undefined || innerRadius === undefined ||
    outerRadius === undefined || percent === undefined ||
    percent < 0.05
  ) return null;
  const RADIAN = Math.PI / 180;
  const radius = (Number(innerRadius) + Number(outerRadius)) * 0.5;
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {`${(Number(percent) * 100).toFixed(0)}%`}
    </text>
  );
}

export function GraficoDistribuicaoEtaria(props: GraficoDistribuicaoEtariaProps) {
  const { dados } = props;

  if (!dados || dados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sem dados de composição para o período selecionado
      </p>
    );
  }

  const dadosFiltrados = dados
    .filter((d) => d.percentual > 0)
    .sort((a, b) => b.percentual - a.percentual);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={dadosFiltrados}
          dataKey="percentual"
          nameKey="categoria"
          cx="50%"
          cy="50%"
          outerRadius={120}
          innerRadius={50}
          labelLine={false}
          label={CustomLabel}
          isAnimationActive={false}
        >
          {dadosFiltrados.map((entry, index) => (
            <Cell key={`cell-${entry.categoria}`} fill={CORES[index % CORES.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Percentual']}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--foreground))',
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: 'hsl(var(--foreground))', fontSize: 13 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
