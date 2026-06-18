'use client'

import { cn } from '@/lib/utils'

interface KpiChartCardProps {
  label: string
  sublabel?: string
  chart: React.ReactNode
  className?: string
  onClick?: () => void
  /** quando presente, exibe um link "ver detalhes" no rodapé do card */
  linkLabel?: string
}

export function KpiChartCard({ label, sublabel, chart, className, onClick, linkLabel }: KpiChartCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left w-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]',
        className
      )}
    >
      <div className="relative rounded-[13px] border border-border bg-card p-5 flex flex-col gap-3 overflow-hidden h-full transition-all duration-300 hover:-translate-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.14)]">
        <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#688070]">
          {label}
        </p>
        <div className="flex items-center justify-center flex-1 min-h-[96px]">
          {chart}
        </div>
        {sublabel && (
          <p className="text-sm text-muted-foreground text-center">{sublabel}</p>
        )}
        {linkLabel && (
          <span className="text-xs text-primary group-hover:underline inline-block">{linkLabel} →</span>
        )}
      </div>
    </button>
  )
}
