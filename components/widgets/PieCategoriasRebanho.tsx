'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  data: { name: string; value: number }[]
  total: number
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function abreviar(nome: string): string {
  const mapa: Record<string, string> = {
    'Bezerro/Bezerra': 'Bezerro',
    'Vaca em Lactação': 'Lact.',
    'Novilha Prenha': 'Nov. Prenha',
    'Novilha (Prenha)': 'Nov. Prenha',
    'Vaca Prenha': 'V. Prenha',
    'Vaca Vazia': 'V. Vazia',
    'Boi Descartado': 'Descarte',
    'Fêmea Descartada': 'Desc. F.',
    'Vaca Matriz': 'Matriz',
  }
  return mapa[nome] ?? nome
}

export function PieCategoriasRebanho({ data, total }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-24 text-xs text-muted-foreground">
        Sem dados de categorias
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative w-36 h-36 flex-shrink-0">
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-20 pointer-events-none"
          style={{ background: 'var(--chart-2)' }}
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
              animationBegin={0}
              animationDuration={700}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold text-card-foreground leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">animais</span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 flex-1 min-w-0">
        {data.slice(0, 5).map((item, i) => (
          <li key={i} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-[11px] text-muted-foreground truncate flex-1">
              {abreviar(item.name)}
            </span>
            <span className="text-[11px] font-semibold text-card-foreground flex-shrink-0">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
