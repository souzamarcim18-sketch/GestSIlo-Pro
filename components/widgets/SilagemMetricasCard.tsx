'use client'
import { Clock, TrendingDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  autonomia: string
  consumo: string
  taxaPerdas: string
}

export function SilagemMetricasCard({ autonomia, consumo, taxaPerdas }: Props) {
  const items = [
    { icon: <Clock size={14} />, label: 'AUTONOMIA ESTIMADA', value: autonomia || '—', sublabel: 'Dias de estoque' },
    { icon: <TrendingDown size={14} />, label: 'CONSUMO MÉDIO/DIA', value: consumo || '—', sublabel: 'Últimos 30 dias' },
    { icon: <AlertTriangle size={14} />, label: 'TAXA DE PERDAS', value: taxaPerdas || '—', sublabel: 'Saídas por descarte' },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col flex-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            'flex flex-col gap-2 p-5 flex-1',
            i < items.length - 1 && 'border-b border-border'
          )}
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {item.icon}
            <span className="text-sm font-semibold uppercase tracking-widest">{item.label}</span>
          </div>
          <p className="text-2xl font-extrabold text-card-foreground leading-none">{item.value}</p>
          <p className="text-sm text-muted-foreground">{item.sublabel}</p>
        </div>
      ))}
    </div>
  )
}
