'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

export default function CtaFinal() {
  const router = useRouter();

  return (
    <section className="bg-background py-24 px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A651" strokeWidth="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6 px-4 py-2 rounded-full" style={{ background: 'rgba(245,208,0,0.1)', color: '#f5d000', border: '1px solid rgba(245,208,0,0.25)' }}>
          Acesso aprovado em até 1 dia útil
        </span>
        <h2 className="text-4xl md:text-5xl font-extrabold mb-5 text-foreground leading-tight">
          Quantas toneladas de silagem você<br />perdeu este ano por falta de controle?
        </h2>
        <p className="text-lg mb-10 text-muted-foreground">
          O plano gratuito já resolve isso. Sem cartão de crédito, sem compromisso.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/solicitar-acesso?plano=free')}
            className="px-10 py-5 font-bold text-lg rounded-2xl shadow-2xl transition-all duration-200 hover:-translate-y-1 text-white"
            style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
          >
            Solicitar acesso gratuito
          </button>
          <a
            href="https://wa.me/5531990875346?text=Ol%C3%A1!%20Tenho%20interesse%20no%20GestSilo%20e%20gostaria%20de%20tirar%20algumas%20d%C3%BAdidas%20antes%20de%20assinar."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-5 font-bold text-base rounded-2xl border-2 border-border text-foreground hover:border-brand-primary hover:text-brand-primary transition-all duration-200"
          >
            <MessageSquare size={18} />
            Fale conosco pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
