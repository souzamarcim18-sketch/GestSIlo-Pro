'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  data: { name: string; value: number; pct: number }[]
}

const TIPO_COLORS: Record<string, string> = {
  leiteiro: 'var(--chart-1)',
  corte: 'var(--chart-2)',
  dupla_aptidao: 'var(--chart-3)',
}

const TIPO_LABELS: Record<string, string> = {
  leiteiro: 'Leiteiro',
  corte: 'Corte',
  dupla_aptidao: 'Dupla Apt.',
}

export function PieComposicaoRebanho({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-24 text-xs text-muted-foreground">
        Sem dados de composição
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative w-36 h-36 flex-shrink-0">
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-15 pointer-events-none"
          style={{ background: 'var(--chart-3)' }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="85%"
              dataKey="value"
              strokeWidth={2}
              stroke="var(--card)"
              paddingAngle={3}
              animationBegin={0}
              animationDuration={700}
            >
              {data.map((item) => (
                <Cell key={item.name} fill={TIPO_COLORS[item.name] ?? 'var(--chart-4)'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col gap-2 flex-1">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: TIPO_COLORS[item.name] ?? 'var(--chart-4)' }}
            />
            <span className="text-sm text-muted-foreground flex-1">
              {TIPO_LABELS[item.name] ?? item.name}
            </span>
            <span className="text-sm font-semibold text-card-foreground">
              {item.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
