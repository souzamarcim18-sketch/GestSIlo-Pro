'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from 'recharts';
import type { GraficoEvolucaoEfetivoProps } from '@/types/rebanho-indicadores';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
} as const;

export function GraficoEvolucaoEfetivo(props: GraficoEvolucaoEfetivoProps) {
  const { dados } = props;

  const dadosFormatados = dados.map((ponto) => ({
    data: new Date(ponto.data).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    quantidade: ponto.quantidade,
    nascimentos: ponto.eventos?.nascimentos ?? 0,
    mortes: ponto.eventos?.mortes ?? 0,
    vendas: ponto.eventos?.vendas ?? 0,
    _data: ponto.data,
  }));

  return (
    <div className="w-full overflow-x-auto">
      <LineChart
        data={dadosFormatados}
        width={Math.max(600, dadosFormatados.length * 50)}
        height={400}
        margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="data"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 14 }}
        />
        <YAxis
          label={{ value: 'Quantidade de Animais', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 14 }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [value, '']}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="quantidade"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Efetivo (animais)"
          isAnimationActive={false}
        />
        {dadosFormatados.map((ponto, idx) => {
          const pontos = [];
          if (ponto.nascimentos > 0) {
            pontos.push(
              <ReferenceDot
                key={`nascimento-${idx}`}
                x={ponto.data}
                y={ponto.quantidade}
                r={5}
                fill="#10b981"
              />
            );
          }
          if (ponto.mortes > 0) {
            pontos.push(
              <ReferenceDot
                key={`morte-${idx}`}
                x={ponto.data}
                y={ponto.quantidade - 10}
                r={5}
                fill="#ef4444"
              />
            );
          }
          if (ponto.vendas > 0) {
            pontos.push(
              <ReferenceDot
                key={`venda-${idx}`}
                x={ponto.data}
                y={ponto.quantidade - 20}
                r={5}
                fill="#06b6d4"
              />
            );
          }
          return pontos;
        })}
      </LineChart>
    </div>
  );
}
