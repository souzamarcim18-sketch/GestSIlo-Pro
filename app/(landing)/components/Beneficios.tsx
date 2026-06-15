import { Wheat, BarChart3, AlertTriangle } from 'lucide-react';
import {
  BENEFICIOS,
  MOCKUP_SIDEBAR_ITEMS,
  MOCKUP_ALERTAS,
  MOCKUP_SILOS,
  MOCKUP_FINANCEIRO,
} from './data';

export default function Beneficios() {
  return (
    <section id="beneficios" className="relative bg-background py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Texto + benefícios */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-4 block text-brand-primary">
              Por que utilizar o GestSilo na sua propriedade?
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-foreground">
              Decisões mais inteligentes,<br />resultado no campo
            </h2>
            <p className="text-base text-muted-foreground mb-8 max-w-md">
              Tudo o que acontece na fazenda — para você agir antes do problema, não depois do prejuízo.
            </p>
            <div className="space-y-5">
              {BENEFICIOS.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="bg-green-dim border border-green-border rounded-[8px] w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <b.Icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-foreground">{b.title}</h4>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup do sistema — fiel ao dashboard real */}
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-[32px] opacity-20 blur-2xl z-0"
              style={{ background: 'linear-gradient(135deg, #00A651, #135a36)' }}
            />

            {/* Shell tipo app com sidebar + conteúdo */}
            <div
              className="relative z-10 rounded-[18px] overflow-hidden border border-white/10 shadow-2xl flex"
              style={{ background: '#161616', minHeight: 500 }}
            >
              {/* Sidebar */}
              <div
                className="w-[132px] flex-shrink-0 border-r border-white/8 flex flex-col py-4 gap-1"
                style={{ background: '#111111' }}
              >
                <div className="px-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-brand-primary flex items-center justify-center">
                      <Wheat size={13} className="text-white" />
                    </div>
                    <span className="text-sm font-extrabold text-foreground tracking-tight">GestSilo</span>
                  </div>
                </div>
                <div
                  className="mx-2 px-2.5 py-2 rounded-[7px] flex items-center gap-2"
                  style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.25)' }}
                >
                  <BarChart3 size={13} className="text-brand-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-brand-primary">Dashboard</span>
                </div>
                {MOCKUP_SIDEBAR_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="mx-2 px-2.5 py-2 rounded-[7px] flex items-center gap-2"
                  >
                    <item.Icon size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Conteúdo do dashboard */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Topbar */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-white/8"
                  style={{ background: '#1a1a1a' }}
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Boa tarde, Marcio!</p>
                    <p className="text-sm font-semibold text-foreground">Visão geral da sua propriedade</p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(0,166,81,0.12)', border: '1px solid rgba(0,166,81,0.25)', color: '#00A651' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    Fazenda MS
                  </div>
                </div>

                <div className="flex-1 overflow-hidden p-3.5 space-y-3.5">
                  {/* Alertas Críticos */}
                  <div className="rounded-[10px] overflow-hidden border border-white/10" style={{ background: '#1c1c1c' }}>
                    <div className="px-3 py-2 border-b border-white/8 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Alertas Críticos</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {MOCKUP_ALERTAS.map((a) => (
                        <div key={a.msg} className="px-3 py-2 flex items-start gap-2">
                          <AlertTriangle size={11} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{a.msg}</p>
                            <p className="text-xs text-muted-foreground">{a.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção SILAGEM */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Silagem</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-[10px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Ocupação</p>
                        <p className="text-lg font-extrabold text-foreground leading-none">67%</p>
                        <p className="text-xs text-muted-foreground mt-1">638 / 953 t</p>
                      </div>
                      <div className="rounded-[10px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Autonomia</p>
                        <p className="text-lg font-extrabold text-foreground leading-none">232</p>
                        <p className="text-xs text-muted-foreground mt-1">dias de estoque</p>
                      </div>
                      <div className="rounded-[10px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Consumo/dia</p>
                        <p className="text-lg font-extrabold text-foreground leading-none">1.283</p>
                        <p className="text-xs text-muted-foreground mt-1">kg/dia (30d)</p>
                      </div>
                    </div>
                    <div className="mt-2 rounded-[10px] border border-white/10 overflow-hidden" style={{ background: '#1c1c1c' }}>
                      {MOCKUP_SILOS.map((s) => (
                        <div
                          key={s.nome}
                          className="px-3 py-2 flex items-center gap-2 border-b border-white/5 last:border-0"
                        >
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.cor }} />
                          <span className="text-xs text-foreground flex-1">{s.nome}</span>
                          <div className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.cor }} />
                          </div>
                          <span className="text-xs font-bold w-7 text-right" style={{ color: s.cor }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção FINANCEIRO */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Financeiro</p>
                    <div className="grid grid-cols-2 gap-2">
                      {MOCKUP_FINANCEIRO.map((f) => (
                        <div key={f.label} className="rounded-[10px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                          <p className="text-base font-bold" style={{ color: f.color }}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
