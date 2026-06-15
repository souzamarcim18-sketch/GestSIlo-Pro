'use client';

import { useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { LANDING_FAQ } from './data';

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-background py-24 px-6 scroll-mt-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-4 py-1.5 rounded-full" style={{ background: 'rgba(0,166,81,0.1)', color: '#00A651', border: '1px solid rgba(0,166,81,0.25)' }}>
            Perguntas frequentes
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
            Ainda com alguma dúvida?
          </h2>
          <p className="text-lg text-muted-foreground">
            Reunimos as perguntas que mais ouvimos de produtores antes de começar.
          </p>
        </div>

        <div className="space-y-3">
          {LANDING_FAQ.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.q}
                className={`rounded-2xl border transition-all duration-200 ${
                  isOpen
                    ? 'border-green-border bg-green-dim/40 shadow-lg shadow-brand-primary/5'
                    : 'border-border2 bg-surface hover:border-green-border/60'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 rounded-2xl"
                >
                  <span className={`text-base font-bold transition-colors ${isOpen ? 'text-brand-primary' : 'text-foreground'}`}>
                    {item.q}
                  </span>
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen ? 'bg-brand-primary rotate-45' : 'bg-white/5'
                    }`}
                  >
                    <Plus size={16} className={isOpen ? 'text-white' : 'text-muted-foreground'} />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Não encontrou? — fala com a gente */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Não encontrou sua resposta? A gente conversa com você sem compromisso.
          </p>
          <a
            href="https://wa.me/5531990875346?text=Ol%C3%A1!%20Tenho%20interesse%20no%20GestSilo%20e%20gostaria%20de%20tirar%20algumas%20d%C3%BAvidas%20antes%20de%20assinar."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-brand-primary border border-green-border bg-green-dim transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary hover:text-white hover:border-brand-primary"
          >
            <MessageSquare size={16} />
            Falar com o GestSilo
          </a>
        </div>
      </div>
    </section>
  );
}
