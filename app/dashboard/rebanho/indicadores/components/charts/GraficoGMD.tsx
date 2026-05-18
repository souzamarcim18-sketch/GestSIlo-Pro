'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { GraficoGMDProps } from '@/types/rebanho-indicadores';

const CORES = ['#00A651', '#3b82f6', '#f59e0b', '#a78bfa', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  padding: '10px 14px',
};

const TICK_STYLE = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

function prepararDados(props: GraficoGMDProps) {
  const { dados, modo } = props;

  if (modo === 'por-animal') {
    if (!dados.length) return [];
    const maxDatas = Math.max(...dados.map(d => d.datas.length));
    return Array.from({ length: maxDatas }, (_, i) => {
      const ponto: Record<string, number | string> = {
        data: dados[0].datas[i]
          ? new Date(dados[0].datas[i]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '',
      };
      dados.forEach((animal) => {
        if (i < animal.pesos.length) ponto[animal.brinco] = animal.pesos[i];
      });
      return ponto;
    });
  }

  if (modo === 'por-lote') {
    const lotesMap: Record<string, { datas: Date[]; pesos: number[] }> = {};
    dados.forEach((animal) => {
      if (!lotesMap[animal.brinco]) lotesMap[animal.brinco] = { datas: animal.datas, pesos: animal.pesos };
    });
    const maxDatas = Math.max(...Object.values(lotesMap).map(l => l.datas.length));
    return Array.from({ length: maxDatas }, (_, i) => {
      const ponto: Record<string, number | string> = {
        data: dados[0].datas[i]
          ? new Date(dados[0].datas[i]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '',
      };
      Object.entries(lotesMap).forEach(([lote, { pesos }]) => {
        if (i < pesos.length) ponto[lote] = pesos[i];
      });
      return ponto;
    });
  }

  return [];
}

export function GraficoGMD(props: GraficoGMDProps) {
  const dadosPrep = prepararDados(props);
  const linhasVisiveis = props.modo === 'por-animal'
    ? Math.min(props.dados.length, 10)
    : Math.min(props.dados.length, 5);

  if (!dadosPrep.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de peso para o período</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={dadosPrep} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <defs>
          {props.dados.slice(0, linhasVisiveis).map((animal, idx) => (
            <filter key={`glow-${animal.animal_id}`} id={`glow-${idx}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        <XAxis
          dataKey="data"
          tick={TICK_STYLE}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
        />
        <YAxis
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={55}
          tickFormatter={(v) => `${v} kg`}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)} kg`, undefined]}
          labelFormatter={(label) => `Data: ${label}`}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 16 }}
          formatter={(value) => (
            <span style={{ color: 'hsl(var(--foreground))', fontSize: 13 }}>{value}</span>
          )}
        />

        {props.dados.slice(0, linhasVisiveis).map((animal, idx) => {
          const cor = CORES[idx % CORES.length];
          return (
            <Line
              key={animal.animal_id}
              type="monotone"
              dataKey={animal.brinco}
              stroke={cor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: cor, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 4px ${cor}80)` }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
