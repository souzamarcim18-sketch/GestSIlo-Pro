'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LandingModalProvider } from '../(landing)/components/LandingModalContext';
import ModalInstitucional from '../(landing)/components/ModalInstitucional';
import Navbar from '../(landing)/components/Navbar';
import Footer from '../(landing)/components/Footer';
import { MODULOS_DETALHADOS, type ModuloDetalhado } from '../(landing)/components/data';

function ModuloSecao({ modulo, index }: { modulo: ModuloDetalhado; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reversed = index % 2 === 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Texto */}
      <div className={reversed ? 'lg:order-2' : 'lg:order-1'}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[12px] mb-5 bg-green-dim border border-green-border">
          <modulo.Icon size={28} strokeWidth={1.8} color="#00A651" />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-5 leading-tight">
          {modulo.title}
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{modulo.desc}</p>
      </div>

      {/* Mockup */}
      <div className={reversed ? 'lg:order-1' : 'lg:order-2'}>
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-[32px] opacity-[0.16] blur-2xl z-0"
            style={{ background: 'linear-gradient(135deg, #00A651, #135a36)' }}
          />
          <div className="relative z-10">
            <modulo.Mockup />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FuncionalidadesPage() {
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <LandingModalProvider>
      <main className="bg-background text-foreground min-h-screen">
        <Navbar />

        {/* Cabeçalho editorial */}
        <header className="pt-36 pb-20 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest mb-4 block text-brand-primary">
              Tudo o que o GestSilo faz pela sua fazenda
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight text-foreground">
              Cada módulo, em detalhe
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
              Do silo ao financeiro, todos os módulos se conversam — o que você registra
              em um lugar aparece automaticamente nos outros. Role para conhecer cada um.
            </p>
          </div>
        </header>

        {/* Storytelling em coluna única, zigue-zague */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto space-y-24 md:space-y-32">
            {MODULOS_DETALHADOS.map((modulo, i) => (
              <ModuloSecao key={modulo.id} modulo={modulo} index={i} />
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 pb-28 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-5">
              Pronto para colocar a sua fazenda no controle?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Comece gratuitamente — sem cartão de crédito.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/solicitar-acesso')}
                className="text-sm font-semibold text-white px-8 py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #135a36, #00843D)' }}
              >
                Solicitar meu acesso
              </button>
              <a
                href="https://wa.me/5531990875346"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-sm font-semibold text-foreground px-8 py-3.5 rounded-xl border border-border hover:bg-white/5 transition-colors"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>

        <Footer />
        <ModalInstitucional />
      </main>
    </LandingModalProvider>
  );
}
