'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface Props {
  percentual: number // 0–100
}

export function GaugeOcupacaoSilos({ percentual }: Props) {
  const data = [{ value: percentual, fill: 'var(--chart-1)' }]

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="100%"
          startAngle={210}
          endAngle={-30}
          data={data}
          barSize={6}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: 'var(--muted)' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-card-foreground">
        {percentual}%
      </span>
    </div>
  )
}
