import Image from 'next/image';

export default function QuemSomos() {
  return (
    <section
      id="quem-somos"
      className="relative overflow-hidden scroll-mt-20"
      style={{ backgroundColor: 'rgb(10, 20, 13)' }}
    >
      {/* Wave de entrada — funde com bg-background da seção anterior */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
          <path d="M0,0 C360,80 1080,0 1440,60 L1440,0 Z" fill="var(--background)" />
        </svg>
      </div>

      {/* Imagem de fundo full-bleed */}
      <Image
        src="/quem-somos.png"
        alt="Produtor rural usando o GestSilo no campo"
        fill
        sizes="100vw"
        className="object-cover z-0"
        style={{ objectPosition: 'center' }}
      />

      {/* Overlay escuro base */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'rgba(10, 20, 13, 0.6)' }}
      />
      {/* Overlay gradiente lateral direito — escurece o lado do texto */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to left, rgba(10,20,13,0.92) 0%, rgba(10,20,13,0.78) 40%, rgba(10,20,13,0.35) 70%, transparent 100%)',
        }}
      />
      {/* Wave de saída — funde com bg-bg2 da seção Planos */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
          <path d="M0,80 C480,0 960,60 1440,20 L1440,80 Z" fill="var(--bg2, #1c1c1c)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pt-32 pb-32 sm:pt-40 sm:pb-40 lg:pt-48 lg:pb-48">
        <div className="lg:ml-auto lg:max-w-2xl">
          <span className="text-xl font-bold uppercase tracking-widest text-brand-primary mb-4 block">
            Quem somos
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6 leading-tight">
            O GestSilo nasceu no campo,<br className="hidden sm:block" /> não no escritório
          </h2>

          <blockquote
            className="text-lg text-foreground leading-relaxed mb-6 pl-4"
            style={{ borderLeft: '3px solid #00A651' }}
          >
            “Sem número confiável na mão, toda decisão na fazenda vira aposta.”
          </blockquote>

          <p className="text-sm text-white/75 leading-relaxed mb-4">
            O GestSilo surgiu da experiência de quem lida todo dia com a terra, com o gado e com a silagem.
            Somos gente do agro construindo tecnologia para o agro — cada funcionalidade resolve um problema
            real da fazenda, do balanço forrageiro ao controle de estoque, do talhão ao fluxo de caixa.
          </p>
          <p className="text-sm text-white/75 leading-relaxed">
            Nosso compromisso é simples: transformar dados em decisões e deixar a gestão da propriedade tão
            sólida quanto o trabalho de quem a sustenta. Sem complicação — só o que ajuda a produzir melhor.
          </p>
        </div>
      </div>
    </section>
  );
}
