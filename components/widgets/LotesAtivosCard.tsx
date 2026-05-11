'use client'

interface Lote {
  id: string
  nome: string
  quantidade_animais?: number | null
}

interface Props {
  lotes: Lote[]
}

const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--primary)',
]

export function LotesAtivosCard({ lotes }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 min-h-[200px] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Lotes Ativos
        </p>
        <span className="text-sm font-bold text-card-foreground bg-muted rounded-full px-2 py-0.5">
          {lotes.length}
        </span>
      </div>
      {lotes.length === 0 ? (
        <p className="text-sm text-muted-foreground flex-1 flex items-center">Nenhum lote cadastrado</p>
      ) : (
        <ul className="flex flex-col gap-2 flex-1">
          {lotes.slice(0, 6).map((lote, i) => (
            <li key={lote.id} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-sm text-card-foreground flex-1 truncate">{lote.nome}</span>
              {lote.quantidade_animais != null && (
                <span className="text-sm text-muted-foreground flex-shrink-0">{lote.quantidade_animais} animais</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
