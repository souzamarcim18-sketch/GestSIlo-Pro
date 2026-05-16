'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { GraficoDistribuicaoEtariaProps } from '@/types/rebanho-indicadores';

const COR = '#3b82f6';

export function GraficoDistribuicaoEtaria(props: GraficoDistribuicaoEtariaProps) {
  const { dados } = props;

  const dadosOrdenados = [...dados].sort((a, b) => b.percentual - a.percentual);

  return (
    <div className="w-full overflow-x-auto">
      <BarChart
        data={dadosOrdenados}
        layout="vertical"
        width={600}
        height={Math.max(300, dados.length * 50)}
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          dataKey="categoria"
          type="category"
          width={90}
          tick={{ fontSize: 14 }}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)}%`}
          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        <Bar
          dataKey="percentual"
          fill={COR}
          name="Percentual (%)"
          isAnimationActive={false}
          radius={[0, 8, 8, 0]}
        />
      </BarChart>
    </div>
  );
}
