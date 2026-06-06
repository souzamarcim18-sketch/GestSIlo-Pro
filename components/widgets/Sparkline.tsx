'use client';

interface SparklineProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
  /** cor da linha — usa var(--chart-2) por padrão */
  stroke?: string;
}

/**
 * Mini-gráfico de linha em SVG puro (sem Recharts) — leve, sem dynamic import.
 * Normaliza a série para a área disponível; achata quando todos os valores são iguais.
 */
export function Sparkline({
  data,
  className,
  width = 120,
  height = 32,
  stroke = 'var(--chart-2)',
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = 2;
  const usableH = height - pad * 2;

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + usableH - ((v - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastY = pad + usableH - ((data[data.length - 1] - min) / range) * usableH;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r={2} fill={stroke} />
    </svg>
  );
}
