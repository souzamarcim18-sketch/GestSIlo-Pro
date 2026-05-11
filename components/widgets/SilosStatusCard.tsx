'use client'

interface Props {
  silosAbertos: number
  silosCadastrados: number
  silosAbertosNomes?: string[]
}

export function SilosStatusCard({ silosAbertos, silosCadastrados, silosAbertosNomes = [] }: Props) {
  return (
    <div className="rounded-[13px] border border-border bg-card p-5 flex flex-col gap-3 h-full shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <p className="text-[0.475rem] font-bold uppercase tracking-[0.13em] text-[#688070]">
        Silos Abertos / Cadastrados
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-[#dceede]">{silosAbertos}</span>
        <span className="text-lg text-muted-foreground font-medium">/{silosCadastrados}</span>
      </div>
      {silosAbertosNomes.length > 0 ? (
        <ul className="flex flex-col gap-1.5 mt-1">
          {silosAbertosNomes.slice(0, 4).map((nome, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: (['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'] as const)[i],
                }}
              />
              {nome}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum silo aberto</p>
      )}
    </div>
  )
}
