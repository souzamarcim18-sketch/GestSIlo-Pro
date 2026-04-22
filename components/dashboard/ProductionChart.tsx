'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface ChartData {
  month: string;
  value: number;
}

interface ProductionChartProps {
  data: ChartData[];
  delta: number;
  total: string;
}

export function ProductionChart({ data, delta, total }: ProductionChartProps) {
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m');

  const filteredData = (() => {
    const limits = { '3m': 3, '6m': 6, '12m': 12 };
    return data.slice(-limits[timeRange]);
  })();

  return (
    <div className="bg-gs-panel border border-gs-line rounded-xl p-[18px] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-gs-text-1 mb-2">
            Produção mensal (t MS)
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-gs-mint font-semibold text-sm">+{delta}%</span>
            <span className="font-display text-[32px] font-bold text-gs-text-1 tracking-[-0.01em]">
              {total}
            </span>
          </div>
        </div>

        {/* Time Range Toggle */}
        <div className="flex gap-1 bg-gs-panel-2 p-[3px] rounded-full border border-gs-line">
          {(['3m', '6m', '12m'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-[14px] py-[5px] text-xs font-medium rounded-full transition-all ${
                timeRange === range
                  ? 'bg-gs-panel text-gs-text-1 shadow-inset-mint'
                  : 'text-gs-text-2 hover:text-gs-text-1'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-[10px] h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient
                id="colorProduction"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#5FE3A1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#5FE3A1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              stroke="rgba(143,201,138,0.06)"
            />
            <XAxis
              dataKey="month"
              tick={{ fill: '#627067', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#627067', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 500]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#17241D',
                border: '1px solid rgba(95,227,161,0.3)',
                borderRadius: '6px',
              }}
              labelStyle={{ color: '#EAF2EB' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#5FE3A1"
              strokeWidth={2}
              fill="url(#colorProduction)"
              dot={{
                fill: '#0B1410',
                stroke: '#5FE3A1',
                r: 4,
                strokeWidth: 2,
              }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
