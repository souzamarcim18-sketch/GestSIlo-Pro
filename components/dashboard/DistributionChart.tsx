'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Segment {
  label: string;
  percent: number;
  color: string;
}

interface DistributionChartProps {
  total: string;
  segments: Segment[];
  season: string;
}

export function DistributionChart({
  total,
  segments,
  season,
}: DistributionChartProps) {
  // Transform segments to PieChart data
  const data = segments.map(seg => ({
    name: seg.label,
    value: seg.percent,
    color: seg.color,
  }));

  return (
    <div className="bg-gs-panel border border-gs-line rounded-xl p-[18px] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-gs-text-1">
          Distribuição de Silagem
        </h3>
        <span className="text-xs font-semibold px-[10px] py-[3px] rounded-full bg-gs-panel-2 text-gs-text-2">
          {season}
        </span>
      </div>

      {/* Chart */}
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={index === 0 ? 1 : index === 1 ? 0.85 : 0.7}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center Text */}
        <div className="absolute text-center">
          <div className="font-display text-sm font-bold text-gs-text-1">
            {total}
          </div>
          <div className="text-[6px] text-gs-text-2 mt-1">toneladas</div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-4 border-t border-gs-line pt-4">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: seg.color,
                  opacity: idx === 0 ? 1 : idx === 1 ? 0.85 : 0.7,
                }}
              />
              <span className="text-xs text-gs-text-2">{seg.label}</span>
            </div>
            <span className="font-mono text-xs font-semibold text-gs-text-1">
              {seg.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
