'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { GraficoComposicaoProps } from '@/types/rebanho-indicadores';

const CORES = [
  '#00A651', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  padding: '10px 14px',
};

function CustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (
    cx === undefined || cy === undefined ||
    midAngle === undefined || innerRadius === undefined ||
    outerRadius === undefined || percent === undefined ||
    Number(percent) < 0.05
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

export function GraficoComposicao(props: GraficoComposicaoProps) {
  const { dados, onClickCategoria } = props;

  const dadosFormatados = Object.entries(dados)
    .map(([categoria, percentual]) => ({ name: categoria, value: Math.round(percentual * 100) / 100 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!dadosFormatados.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de composição para o período</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={dadosFormatados}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={CustomLabel}
          isAnimationActive={false}
          onClick={(entry) => {
            if (onClickCategoria && entry.name) onClickCategoria(entry.name as string);
          }}
          style={{ cursor: onClickCategoria ? 'pointer' : 'default' }}
        >
          {dadosFormatados.map((_, idx) => (
            <Cell
              key={`cell-${idx}`}
              fill={CORES[idx % CORES.length]}
              stroke="transparent"
              style={{ filter: `drop-shadow(0 0 5px ${CORES[idx % CORES.length]}60)` }}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Percentual']}
          contentStyle={TOOLTIP_STYLE}
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
