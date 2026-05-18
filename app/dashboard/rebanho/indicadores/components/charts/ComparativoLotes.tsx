'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ComparativoLotesProps } from '@/types/rebanho-indicadores';

const CORES_INDICADOR: Record<string, string> = {
  gmd: '#00A651',
  natalidade: '#3b82f6',
  prenhez: '#a78bfa',
  peso: '#f59e0b',
};

const CHAVES_INDICADOR: Record<string, string> = {
  gmd: 'gmd',
  natalidade: 'taxaNatalidade',
  prenhez: 'taxaPrenhez',
  peso: 'pesoMedio',
};

const UNIDADES: Record<string, string> = {
  gmd: 'kg/dia',
  natalidade: '%',
  prenhez: '%',
  peso: 'kg',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  padding: '10px 14px',
};

const TICK_STYLE = { fill: '#688070', fontSize: 12 };

export function ComparativoLotes(props: ComparativoLotesProps) {
  const { dados, indicador, onSelectLote } = props;

  const chaveIndicador = CHAVES_INDICADOR[indicador];
  const unidade = UNIDADES[indicador];
  const cor = CORES_INDICADOR[indicador];

  const dadosGrafico = dados.map((lote) => ({
    loteNome: lote.loteNome,
    valor: Number(lote[chaveIndicador as keyof typeof lote] ?? 0),
    loteId: lote.loteId,
  }));

  const maxValor = Math.max(...dadosGrafico.map((d) => d.valor));

  return (
    <div className="space-y-6">
      {/* Ranking cards */}
      <div className="space-y-2">
        {dados.map((lote, idx) => {
          const valorNum = Number(lote[chaveIndicador as keyof typeof lote] ?? 0);
          const pct = maxValor > 0 ? (valorNum / maxValor) * 100 : 0;
          return (
            <button
              key={lote.loteId}
              onClick={() => onSelectLote?.(lote.loteId)}
              className="w-full text-left rounded-xl border border-border bg-card/60 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{idx + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{lote.loteNome}</span>
                  <span className="text-xs text-muted-foreground">{lote.quantidadeAnimais} animais</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {valorNum.toFixed(2)} {unidade}
                  </span>
                  {lote.trend === 'up' && (
                    <div className="flex items-center gap-0.5 text-green-400 text-xs font-medium">
                      <TrendingUp className="h-3.5 w-3.5" />
                      +{lote.trendValor?.toFixed(2)}
                    </div>
                  )}
                  {lote.trend === 'down' && (
                    <div className="flex items-center gap-0.5 text-red-400 text-xs font-medium">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {lote.trendValor?.toFixed(2)}
                    </div>
                  )}
                  {lote.trend === 'stable' && (
                    <div className="flex items-center gap-0.5 text-muted-foreground text-xs">
                      <Minus className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </div>
              {/* Barra de progresso inline */}
              <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: cor,
                    boxShadow: `0 0 6px ${cor}80`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Gráfico de barras premium */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="gradLote" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.95} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="loteNome"
            tick={TICK_STYLE}
            axisLine={{ stroke: '#2a4433' }}
            tickLine={false}
          />
          <YAxis
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v) => `${v} ${unidade}`}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)} ${unidade}`, 'Valor']}
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: '#222222', opacity: 0.5 }}
          />
          <Bar
            dataKey="valor"
            fill="url(#gradLote)"
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
            maxBarSize={64}
            style={{ filter: `drop-shadow(0 0 6px ${cor}50)` }}
          >
            {dadosGrafico.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill="url(#gradLote)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
