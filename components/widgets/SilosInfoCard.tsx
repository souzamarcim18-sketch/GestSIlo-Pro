'use client'
import { cn } from '@/lib/utils'

interface CulturaItem {
  name: string
  value: number
  pct: number
}

interface Props {
  silosAbertos: number
  silosCadastrados: number
  silosAbertosNomes?: string[]
  culturas: CulturaItem[]
}

// Escala monocromática de verde: a cor aqui é só rótulo de categoria, não
// status. Mantém o card calmo e reserva vermelho/amarelo para alertas reais.
const CHART_COLORS = [
  'var(--cat-green-5)', 'var(--cat-green-4)', 'var(--cat-green-3)',
  'var(--cat-green-2)', 'var(--cat-green-1)',
]

export function SilosInfoCard({
  silosAbertos,
  silosCadastrados,
  silosAbertosNomes = [],
  culturas = [],
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col flex-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">

      {/* Seção 1 — Silos Abertos */}
      <div className="flex flex-col gap-3 p-5 border-b border-border flex-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Silos Abertos / Cadastrados
        </p>
        <div className="flex items-start justify-between gap-3 flex-1">
          {/* Lista de silos à esquerda */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {silosAbertosNomes.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {silosAbertosNomes.slice(0, 4).map((nome, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-card-foreground truncate">{nome}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum silo aberto</p>
            )}
          </div>
          {/* Contagem à direita */}
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="text-3xl font-extrabold text-card-foreground leading-none">{silosAbertos}</span>
            <span className="text-lg text-muted-foreground font-medium">/{silosCadastrados}</span>
          </div>
        </div>
      </div>

      {/* Seção 2 — Culturas Ensiladas */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Culturas Ensiladas
        </p>
        {culturas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem culturas registradas</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {culturas.map((item, i) => (
              <li key={item.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-sm text-card-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-card-foreground">{item.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  )
}
