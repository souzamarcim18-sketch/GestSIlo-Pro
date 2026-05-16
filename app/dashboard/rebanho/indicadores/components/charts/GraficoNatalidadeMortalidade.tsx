'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { GraficoNatalidadeMortalidadeProps } from '@/types/rebanho-indicadores';

export function GraficoNatalidadeMortalidade(props: GraficoNatalidadeMortalidadeProps) {
  const { dados } = props;

  return (
    <div className="w-full overflow-x-auto">
      <BarChart
        data={dados}
        width={Math.max(600, dados.length * 60)}
        height={400}
        margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="mes"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 14 }}
        />
        <YAxis
          label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 14 }}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)}%`}
          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        <Bar
          dataKey="natalidade"
          fill="#10b981"
          name="Natalidade (%)"
          isAnimationActive={false}
        />
        <Bar
          dataKey="mortalidade"
          fill="#ef4444"
          name="Mortalidade (%)"
          isAnimationActive={false}
        />
      </BarChart>
    </div>
  );
}
