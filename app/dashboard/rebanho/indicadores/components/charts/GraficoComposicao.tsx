'use client';

import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import type { GraficoComposicaoProps } from '@/types/rebanho-indicadores';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function GraficoComposicao(props: GraficoComposicaoProps) {
  const { dados, onClickCategoria } = props;

  const dadosFormatados = Object.entries(dados).map(([categoria, percentual]) => ({
    name: categoria,
    value: Math.round(percentual * 100) / 100,
  }));

  return (
    <div className="flex justify-center w-full">
      <PieChart width={500} height={400}>
        <Pie
          data={dadosFormatados}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${name} (${value.toFixed(1)}%)`}
          onClick={(entry) => {
            if (onClickCategoria && entry.name) {
              onClickCategoria(entry.name as string);
            }
          }}
        >
          {dadosFormatados.map((_, idx) => (
            <Cell key={`cell-${idx}`} fill={CORES[idx % CORES.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)}%`}
          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
        />
        <Legend />
      </PieChart>
    </div>
  );
}
