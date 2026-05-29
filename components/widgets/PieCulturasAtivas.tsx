'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: { name: string; value: number }[]
  total: number
}

const CHART_COLORS = [
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-1)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontSize: '12px',
  color: 'var(--card-foreground)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
} as const;

export function PieCulturasAtivas({ data, total }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Sem dados</span>
      </div>
    )
  }

  return (
    <div className="relative w-36 h-36">
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: 'var(--chart-3)' }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="85%"
            dataKey="value"
            strokeWidth={2}
            stroke="var(--card)"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [`${value} talhão/talhões`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-card-foreground leading-none">{total}</span>
        <span className="text-xs text-muted-foreground mt-0.5">culturas</span>
      </div>
    </div>
  )
}
