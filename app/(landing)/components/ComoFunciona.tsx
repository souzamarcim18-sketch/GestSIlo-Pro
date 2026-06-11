import { STEPS } from './data';

export default function ComoFunciona() {
  return (
    <section id="como-funciona" style={{ background: 'var(--sidebar)' }} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-3 block">
            Simples de começar
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
            Em 3 passos, sua fazenda organizada
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Linha conectora no desktop */}
          <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px" style={{ background: 'rgba(0,196,90,0.2)' }} />

          {STEPS.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative z-10"
                style={{ background: 'rgba(0,196,90,0.1)', border: '1px solid rgba(0,196,90,0.25)' }}
              >
                <span
                  className="text-2xl font-black"
                  style={{ color: '#00c45a', letterSpacing: '-0.04em' }}
                >
                  {step.num}
                </span>
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
