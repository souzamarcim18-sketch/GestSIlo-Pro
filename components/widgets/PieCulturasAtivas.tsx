'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: { name: string; value: number }[]
}

const CHART_COLORS = [
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-1)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function PieCulturasAtivas({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted flex-shrink-0" />
    )
  }

  return (
    <div className="w-14 h-14 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="90%"
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value, name) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
