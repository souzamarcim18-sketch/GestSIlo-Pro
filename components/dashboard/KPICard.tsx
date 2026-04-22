'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  unit: string;
  delta: number;
  trend: 'up' | 'down';
  sparklineData?: number[];
}

export function KPICard({
  label,
  value,
  unit,
  delta,
  trend,
  sparklineData = [],
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-gs-mint' : 'text-gs-danger';

  // Generate sparkline SVG
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length === 0) return null;

    const width = 50;
    const height = 16;
    const padding = 2;

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData
      .map((val, i) => {
        const x = (i / (sparklineData.length - 1)) * (width - padding * 2) + padding;
        const y = height - (((val - min) / range) * (height - padding * 2) + padding);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="50"
        height="16"
        className="mt-2"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#5FE3A1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <div className="bg-gs-panel border border-gs-line rounded-lg p-3 sm:p-4 flex flex-col h-full">
      <label className="text-xs text-gs-text-3 uppercase tracking-[0.06em] font-semibold truncate">
        {label}
      </label>

      <div className="flex items-baseline gap-1 mt-[6px]">
        <span className="font-display text-lg sm:text-[22px] font-bold text-gs-text-1 leading-[1.1] tracking-[-0.02em]">
          {value}
        </span>
        <span className="text-xs font-medium text-gs-text-3">{unit}</span>
      </div>

      <div className="flex items-center justify-between mt-[6px]">
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          <TrendIcon size={12} />
          <span className="font-mono text-[10px] sm:text-xs">{trend === 'up' ? '+' : '−'}{Math.abs(delta)}%</span>
        </div>
        {renderSparkline()}
      </div>
    </div>
  );
}
