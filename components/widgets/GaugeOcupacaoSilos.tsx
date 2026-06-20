'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface Props {
  percentual: number
}

const START_ANGLE = 210
const TOTAL_ARC = 240

export function GaugeOcupacaoSilos({ percentual }: Props) {
  const clampedPct = Math.min(100, Math.max(0, percentual))
  const fillEndAngle = START_ANGLE - (clampedPct / 100) * TOTAL_ARC

  const bgData = [{ value: 1, fill: 'var(--muted)' }]
  const fgData = [{ value: 1, fill: 'var(--chart-1)' }]

  return (
    <div className="relative w-44 h-44">
      {/* Background arc (track) */}
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="62%"
          outerRadius="90%"
          startAngle={START_ANGLE}
          endAngle={START_ANGLE - TOTAL_ARC}
          data={bgData}
          barSize={10}
        >
          <RadialBar dataKey="value" cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Foreground arc (fill) */}
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="90%"
            startAngle={START_ANGLE}
            endAngle={fillEndAngle}
            data={fgData}
            barSize={10}
          >
            <RadialBar dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-card-foreground leading-none">
          {clampedPct}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">ocupado</span>
      </div>
    </div>
  )
}
