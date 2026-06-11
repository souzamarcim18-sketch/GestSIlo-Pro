'use client';

import { useRouter } from 'next/navigation';
import {
  FUNCIONALIDADES_CORE,
  FUNCIONALIDADES_GESTAO,
  FUNCIONALIDADES_SUPORTE,
} from './data';

export default function Funcionalidades() {
  const router = useRouter();

  return (
    <section id="funcionalidades" className="bg-bg2 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
            Uma plataforma para cada parte da sua fazenda
          </h2>
          <p className="text-lg max-w-xl mx-auto text-muted-foreground">
            Módulos integrados que se conversam — o que você registra em um lugar aparece automaticamente nos outros.
          </p>
        </div>

        {/* Linha 1 — módulos core */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {FUNCIONALIDADES_CORE.map((item) => (
            <div
              key={item.title}
              className="bg-surface rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-8 transition-all duration-200 hover:-translate-y-1 hover:bg-surface2 cursor-default"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
              <div className="mb-4">
                <item.Icon size={36} strokeWidth={1.8} color={item.iconColor} />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Linha 2 — módulos de gestão */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {FUNCIONALIDADES_GESTAO.map((item) => (
            <div
              key={item.title}
              className="bg-surface rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-surface2 cursor-default"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
              <div className="mb-3">
                <item.Icon size={32} strokeWidth={1.8} color={item.iconColor} />
              </div>
              <h3 className="font-bold text-foreground text-base mb-1.5">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Linha 3 — módulos de suporte e análise */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FUNCIONALIDADES_SUPORTE.map((item) => (
            <div
              key={item.title}
              className="bg-surface rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-surface2 cursor-default"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
              <div className="mb-3">
                <item.Icon size={32} strokeWidth={1.8} color={item.iconColor} />
              </div>
              <h3 className="font-bold text-foreground text-base mb-1.5">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA intermediário */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/solicitar-acesso?plano=free')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline transition-colors"
          >
            Quero conhecer todos os módulos na prática
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
