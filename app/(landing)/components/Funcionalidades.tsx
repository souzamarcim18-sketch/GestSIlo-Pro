'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ABAS_FUNCIONALIDADES } from './data';

export default function Funcionalidades() {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string>(ABAS_FUNCIONALIDADES[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = ABAS_FUNCIONALIDADES.findIndex((a) => a.id === activeId);
  const active = ABAS_FUNCIONALIDADES[activeIndex];

  const focusTab = (index: number) => {
    const aba = ABAS_FUNCIONALIDADES[(index + ABAS_FUNCIONALIDADES.length) % ABAS_FUNCIONALIDADES.length];
    setActiveId(aba.id);
    tabRefs.current[aba.id]?.focus();
    tabRefs.current[aba.id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusTab(activeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusTab(activeIndex - 1);
    }
  };

  return (
    <section id="funcionalidades" className="bg-bg2 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
            Uma plataforma para cada parte da sua fazenda
          </h2>
          <p className="text-lg max-w-xl mx-auto text-muted-foreground">
            Módulos integrados que se conversam — o que você registra em um lugar aparece automaticamente nos outros.
          </p>
        </div>

        {/* Trilha de abas — horizontal no desktop, carrossel deslizável no mobile */}
        <div
          role="tablist"
          aria-label="Funcionalidades"
          onKeyDown={onKeyDown}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:justify-center md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ABAS_FUNCIONALIDADES.map((aba) => {
            const isActive = aba.id === activeId;
            return (
              <button
                key={aba.id}
                ref={(el) => { tabRefs.current[aba.id] = el; }}
                role="tab"
                id={`tab-${aba.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${aba.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveId(aba.id)}
                className={`snap-center flex-shrink-0 inline-flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'text-foreground border-b-2'
                    : 'text-muted-foreground border-white/[0.07] hover:text-foreground hover:bg-surface2'
                }`}
                style={
                  isActive
                    ? {
                        background: 'var(--surface)',
                        borderColor: 'rgba(255,255,255,0.07)',
                        borderBottomColor: '#00A651',
                        boxShadow: '0 0 0 1px rgba(0,166,81,0.18), 0 4px 24px rgba(0,166,81,0.18)',
                      }
                    : { background: 'var(--surface)' }
                }
              >
                <aba.Icon size={18} strokeWidth={1.9} color={isActive ? '#00A651' : aba.iconColor} />
                {aba.title}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da aba ativa */}
        <div
          key={active.id}
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
          className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center motion-safe:animate-[fadeIn_0.4s_ease]"
        >
          {/* Texto descritivo */}
          <div className="order-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] mb-4 bg-green-dim border border-green-border">
              <active.Icon size={24} strokeWidth={1.9} color="#00A651" />
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-4">{active.title}</h3>
            <p className="text-base text-muted-foreground leading-relaxed">{active.desc}</p>
          </div>

          {/* Mockup — abaixo do texto no mobile, ao lado no desktop */}
          <div className="order-2 relative">
            <div
              className="absolute -inset-4 rounded-[32px] opacity-20 blur-2xl z-0"
              style={{ background: 'linear-gradient(135deg, #00A651, #135a36)' }}
            />
            <div className="relative z-10">
              <active.Mockup />
            </div>
          </div>
        </div>

        {/* CTA — página dedicada */}
        <div className="mt-14 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            E isso é só uma parte do que o GestSilo faz pela sua fazenda.
          </p>
          <button
            onClick={() => router.push('/funcionalidades')}
            className="group inline-flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm font-bold text-brand-primary border border-green-border bg-green-dim shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/10 hover:bg-brand-primary hover:text-white hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          >
            Conheça todas as funcionalidades
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
