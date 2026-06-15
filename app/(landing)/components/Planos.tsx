'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { PLANOS } from './data';

export default function Planos() {
  const router = useRouter();
  const [planoAnual, setPlanoAnual] = useState(false);

  return (
    <section id="planos" className="relative bg-bg2 pt-32 pb-32 px-6 scroll-mt-20">
      {/* Wave de entrada — funde com rgb(10,20,13) da seção QuemSomos */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
          <path d="M0,0 C480,80 960,20 1440,60 L1440,0 Z" fill="rgb(10,20,13)" />
        </svg>
      </div>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-4 py-1.5 rounded-full" style={{ background: 'rgba(0,166,81,0.1)', color: '#00A651', border: '1px solid rgba(0,166,81,0.25)' }}>
            Plano gartuito e planos que não pesam financeiramente para quem produz com eficiência
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
            O plano certo para cada fazenda!
          </h2>
          <p className="text-lg text-muted-foreground">
            Grátis para começar. Sem surpresa e sem limites para crescer!
          </p>
        </div>

        {/* Toggle mensal / anual */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-semibold transition-colors ${!planoAnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensal
          </span>
          <button
            onClick={() => setPlanoAnual((v) => !v)}
            className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
            style={{ background: planoAnual ? '#00843D' : 'rgba(255,255,255,0.12)' }}
            aria-label="Alternar plano anual"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: planoAnual ? 'translateX(24px)' : 'translateX(0)' }}
            />
          </button>
          <span className={`text-sm font-semibold transition-colors ${planoAnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {planoAnual && (
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(0,166,81,0.15)', color: '#00A651', border: '1px solid rgba(0,166,81,0.3)' }}
            >
              2 meses grátis
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANOS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[13px] p-7 border relative transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col ${
                plan.highlight ? 'shadow-2xl ring-2 ring-brand-primary/40' : 'bg-surface border-border2'
              }`}
              style={
                plan.highlight
                  ? { background: 'linear-gradient(145deg, #00A651, #00843D)', borderColor: '#00843D', boxShadow: '0 20px 50px -12px rgba(0,166,81,0.45)' }
                  : {}
              }
            >
              {plan.highlight && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow whitespace-nowrap"
                  style={{ background: '#FEF08A', color: '#854d0e' }}
                >
                  Mais popular
                </div>
              )}
              <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-4 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                {plan.desc}
              </p>
              <div className="mb-6">
                {plan.freeForever ? (
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                    Grátis
                  </span>
                ) : planoAnual ? (
                  <>
                    <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                      R$ {plan.priceAnnually?.toLocaleString('pt-BR')}
                    </span>
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                      /ano
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                      R$ {plan.priceMonthly}
                    </span>
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                      /mês
                    </span>
                  </>
                )}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-white' : 'text-brand-primary'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className={plan.highlight ? 'text-white/95' : 'text-muted-foreground'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push(`/solicitar-acesso?plano=${plan.name.toLowerCase()}`)}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90"
                style={
                  plan.highlight
                    ? { background: '#ffffff', color: '#00843D' }
                    : { background: 'linear-gradient(135deg, #00A651, #00843D)', color: '#ffffff' }
                }
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Selos de confiança */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          {[
            'Sem cadastro de cartão para começar gratuitamente',
            'Cancele quando quiser',
            'Seus dados sob sigilo e backup automático',
          ].map((selo) => (
            <span key={selo} className="inline-flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {selo}
            </span>
          ))}
        </div>

        {/* Link de dúvidas — WhatsApp */}
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Ficou com dúvidas sobre qual o melhor plano para sua propriedade?
          </p>
          <a
            href="https://wa.me/5531990875346?text=Ol%C3%A1!%20Tenho%20interesse%20no%20GestSilo%20e%20gostaria%20de%20tirar%20algumas%20d%C3%BAvidas%20antes%20de%20assinar."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
          >
            <MessageSquare size={16} />
            Clique aqui que te ajudamos!
          </a>
        </div>
      </div>

      {/* Wave de saída — funde com bg-background da seção FAQ */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
          <path d="M0,30 C480,80 960,0 1440,50 L1440,80 L0,80 Z" fill="var(--background)" />
        </svg>
      </div>
    </section>
  );
}
