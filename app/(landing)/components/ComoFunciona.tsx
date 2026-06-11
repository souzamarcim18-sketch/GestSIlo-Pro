import { MailCheck, Sprout, LineChart, type LucideIcon } from 'lucide-react';
import { STEPS } from './data';

const STEP_ICONS: LucideIcon[] = [MailCheck, Sprout, LineChart];

export default function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="relative py-24 px-6 overflow-hidden"
      style={{
        background:
          'linear-gradient(to bottom, rgb(10, 20, 13) 0%, var(--sidebar) 28%, var(--sidebar) 100%)',
      }}
    >
      {/* Glow ambiente suave no topo, costurando com o Hero */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[1100px] rounded-full blur-[120px] opacity-40"
        style={{ background: 'radial-gradient(closest-side, rgba(0,196,90,0.18), transparent)' }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-primary mb-4">
            <span className="h-px w-8 bg-brand-primary/40" />
            Simples de começar
            <span className="h-px w-8 bg-brand-primary/40" />
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
            Em 3 passos, sua fazenda organizada
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Linha conectora no desktop */}
          <div
            className="hidden md:block absolute top-[2.75rem] left-[16.66%] right-[16.66%] h-px"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(0,196,90,0.35) 20%, rgba(0,196,90,0.35) 80%, transparent)',
            }}
          />

          {STEPS.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Sprout;
            return (
              <div
                key={step.num}
                className="group relative flex flex-col items-center text-center rounded-3xl border border-white/[0.07] bg-white/[0.02] px-7 pt-10 pb-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-primary/30 hover:bg-white/[0.04]"
                style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}
              >
                {/* Marcador numérico — marca d'água no canto interno */}
                <span
                  className="absolute top-4 right-5 text-4xl font-black leading-none tracking-tight select-none"
                  style={{ color: 'rgba(0,196,90,0.12)' }}
                  aria-hidden="true"
                >
                  {step.num}
                </span>

                {/* Ícone com anel */}
                <div className="relative z-10 mb-6">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: 'linear-gradient(145deg, rgba(0,196,90,0.16), rgba(0,132,61,0.08))',
                      border: '1px solid rgba(0,196,90,0.28)',
                      boxShadow: '0 8px 24px -8px rgba(0,196,90,0.45)',
                    }}
                  >
                    <Icon className="h-7 w-7 text-brand-primary" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                </div>

                <h3 className="font-bold text-lg text-foreground mb-2.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
