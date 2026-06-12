'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { HERO_PROVA_SOCIAL } from './data';

export default function Hero() {
  const router = useRouter();

  return (
    <section
      className="relative min-h-[88vh] flex items-center overflow-hidden"
      style={{ backgroundColor: 'rgb(10, 20, 13)' }}
    >
      {/* Imagem de fundo full-bleed — apenas desktop */}
      <Image
        src="/hero1.png"
        alt="Produtor rural usando GestSilo no campo"
        fill
        className="hidden lg:block object-cover z-0"
        style={{ objectFit: 'cover', objectPosition: 'right center' }}
        priority
      />

      {/* Overlay escuro base — apenas desktop (no mobile a section já é escura) */}
      <div
        className="hidden lg:block absolute inset-0 pointer-events-none"
        style={{ background: 'rgba(10, 20, 13, 0.55)' }}
      />
      {/* Overlay gradiente lateral esquerdo — apenas desktop */}
      <div
        className="hidden lg:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(10,20,13,0.92) 0%, rgba(10,20,13,0.7) 35%, rgba(10,20,13,0.2) 65%, transparent 100%)',
        }}
      />
      {/* Overlay gradiente inferior — apenas desktop */}
      <div
        className="hidden lg:block absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(10,20,13,0.8) 0%, transparent 40%)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20 sm:py-32 lg:py-40">
        {/* Texto */}
        <div className="flex flex-col justify-center max-w-xl">
            <div className="mb-8">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm border"
                style={{
                  backgroundColor: 'rgba(0,166,81,0.15)',
                  color: 'var(--brand-green-primary)',
                  borderColor: 'rgba(0,166,81,0.3)',
                }}
              >
                Gestão feita para o campo brasileiro
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-[1.08] tracking-tight mb-8">
              <span className="text-foreground">
                Planeje, gerencie e<br />maximize a{' '}
              </span>
              <span className="relative inline-block text-brand-primary">
                produção
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="6"
                  viewBox="0 0 200 6"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q50 0 100 4 Q150 8 200 3"
                    stroke="#00843D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.6"
                  />
                </svg>
              </span>
              <br />
              <span className="text-foreground/85">da sua propriedade</span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed mb-6 max-w-2xl text-white/75">
              Saiba quantos dias de estoque seu rebanho tem — em tempo real, direto do computador ou do celular.
              Sem planilha, sem palpite e sem depender de sinal no campo.
            </p>

            {/* Prova social inline */}
            <div className="flex flex-col gap-2 mb-8">
              {HERO_PROVA_SOCIAL.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                    <circle cx="8" cy="8" r="8" fill="rgba(0,196,90,0.15)" />
                    <path d="M5 8l2 2 4-4" stroke="#00c45a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-white/65">{item}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={() => router.push('/solicitar-acesso?plano=free')}
                className="px-8 py-4 font-bold text-base rounded-2xl shadow-2xl transition-all duration-200 hover:-translate-y-1 text-white whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
              >
                Começar grátis
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-4 font-semibold text-base rounded-2xl border border-white/25 text-white/70 hover:text-white hover:border-white/50 transition-all duration-200 whitespace-nowrap"
              >
                Entrar
              </button>
            </div>
        </div>
      </div>
    </section>
  );
}
