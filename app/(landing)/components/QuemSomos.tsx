import Image from 'next/image';

export default function QuemSomos() {
  return (
    <section
      id="quem-somos"
      className="relative overflow-hidden scroll-mt-20"
      style={{ backgroundColor: 'rgb(10, 20, 13)' }}
    >
      {/* Imagem de fundo full-bleed */}
      <Image
        src="/quem-somos.png"
        alt="Produtor rural usando o GestSilo no campo"
        fill
        sizes="100vw"
        className="object-cover z-0"
        style={{ objectPosition: 'center top' }}
      />

      {/* Fade de entrada — dissolve bg-background da seção Benefícios para a foto */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: 160, background: 'linear-gradient(to bottom, var(--background) 0%, transparent 100%)' }}
      />

      {/* Overlay escuro base */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'rgba(10, 20, 13, 0.55)' }}
      />

      {/* Overlay gradiente lateral direito — escurece o lado do texto */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to left, rgba(10,20,13,0.92) 0%, rgba(10,20,13,0.78) 40%, rgba(10,20,13,0.35) 70%, transparent 100%)',
        }}
      />

      {/* Fade de saída — dissolve para #1c1c1c da seção Planos */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: 160, background: 'linear-gradient(to top, #1c1c1c 0%, transparent 100%)' }}
      />

      <div className="relative z-20 max-w-7xl mx-auto px-6 w-full py-32 sm:py-40 lg:py-48">
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
            "Sem número confiável na mão, toda decisão na fazenda vira aposta."
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
