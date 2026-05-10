'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface Props {
  percentual: number
}

export function GaugeOcupacaoSilos({ percentual }: Props) {
  const data = [{ value: percentual, fill: 'var(--chart-1)' }]

  return (
    <div className="relative w-36 h-36">
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ background: 'var(--chart-1)' }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="62%"
          outerRadius="90%"
          startAngle={210}
          endAngle={-30}
          data={data}
          barSize={10}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            background={{ fill: 'var(--muted)' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-card-foreground leading-none">
          {percentual}%
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">ocupado</span>
      </div>
    </div>
  )
}
