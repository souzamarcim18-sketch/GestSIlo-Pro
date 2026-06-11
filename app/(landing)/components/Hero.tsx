'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { HERO_PROVA_SOCIAL } from './data';

export default function Hero() {
  const router = useRouter();

  return (
    <section className="bg-background relative min-h-[80vh] flex items-center overflow-hidden pt-20">
      {/* Grid pattern */}
      <div className="absolute left-0 top-0 h-full w-full z-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A651" strokeWidth="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh] py-12">

          {/* COLUNA ESQUERDA — Texto */}
          <div className="flex flex-col justify-center">
            <div className="mb-8">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm border"
                style={{
                  backgroundColor: 'rgba(0,166,81,0.15)',
                  color: 'var(--brand-green-primary)',
                  borderColor: 'rgba(0,166,81,0.3)',
                }}
              >
                Um ambiente de gestão feita para os pecuaristas e agricultores brasileiros
              </span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.08] tracking-tight mb-8">
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

            <p className="text-lg md:text-xl leading-relaxed mb-6 max-w-2xl text-muted-foreground">
              Tenha o controle total de suas silagens — e saiba quantos dias o seu rebanho tem de estoque.
              Sem planilha, sem palpite, sem depender de sinal no campo.
            </p>

            {/* Prova social inline */}
            <div className="flex flex-col gap-2 mb-8">
              {HERO_PROVA_SOCIAL.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                    <circle cx="8" cy="8" r="8" fill="rgba(0,196,90,0.15)" />
                    <path d="M5 8l2 2 4-4" stroke="#00c45a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
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
                className="px-6 py-4 font-semibold text-base rounded-2xl border border-border text-muted-foreground hover:text-foreground hover:border-border2 transition-all duration-200 whitespace-nowrap"
              >
                Entrar
              </button>
              <a
                href="#como-funciona"
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Ver como funciona →
              </a>
            </div>
          </div>

          {/* COLUNA DIREITA — Imagem editorial */}
          <div className="relative hidden lg:flex items-center justify-end">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: '4/3' }}>
              <Image
                src="/imagem-hero.webp?v=1"
                alt="Produtor rural usando GestSilo no campo"
                fill
                className="object-cover"
                priority
                unoptimized
              />
              {/* Gradiente de fusão com o fundo à esquerda */}
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, #161616 0%, transparent 30%)' }}
              />
              {/* Gradiente inferior suave */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/4 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(22,22,22,0.6), transparent)' }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
