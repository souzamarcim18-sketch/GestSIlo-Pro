'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { GraficoGMDProps } from '@/types/rebanho-indicadores';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'];

function prepararDados(props: GraficoGMDProps) {
  const { dados, modo } = props;

  if (modo === 'por-animal') {
    if (!dados.length) return [];

    const maxDatas = Math.max(...dados.map(d => d.datas.length));
    const result: Record<string, number | string>[] = [];

    for (let i = 0; i < maxDatas; i++) {
      const ponto: Record<string, number | string> = {};
      ponto.data = dados[0].datas[i]
        ? new Date(dados[0].datas[i]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : '';

      dados.forEach((animal) => {
        if (i < animal.pesos.length) {
          ponto[animal.brinco] = animal.pesos[i];
        }
      });

      result.push(ponto);
    }

    return result;
  }

  if (modo === 'por-lote') {
    const lotesMap: Record<string, { datas: Date[]; pesos: number[] }> = {};

    dados.forEach((animal) => {
      if (!lotesMap[animal.brinco]) {
        lotesMap[animal.brinco] = { datas: animal.datas, pesos: animal.pesos };
      }
    });

    const maxDatas = Math.max(...Object.values(lotesMap).map(l => l.datas.length));
    const result: Record<string, number | string>[] = [];

    for (let i = 0; i < maxDatas; i++) {
      const ponto: Record<string, number | string> = {};
      ponto.data = dados[0].datas[i]
        ? new Date(dados[0].datas[i]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : '';

      Object.entries(lotesMap).forEach(([lote, { pesos }]) => {
        if (i < pesos.length) {
          ponto[lote] = pesos[i];
        }
      });

      result.push(ponto);
    }

    return result;
  }

  return [];
}

export function GraficoGMD(props: GraficoGMDProps) {
  const dados = prepararDados(props);
  const linhasVisíveis = props.modo === 'por-animal' ? Math.min(props.dados.length, 10) : Math.min(props.dados.length, 5);

  return (
    <div className="w-full overflow-x-auto">
      <LineChart
        data={dados}
        width={Math.max(600, dados.length * 40)}
        height={400}
        margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="data"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)} kg`}
          labelFormatter={(label) => `Data: ${label}`}
          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        {props.dados.slice(0, linhasVisíveis).map((animal, idx) => (
          <Line
            key={animal.animal_id}
            type="monotone"
            dataKey={animal.brinco}
            stroke={CORES[idx % CORES.length]}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </div>
  );
}
