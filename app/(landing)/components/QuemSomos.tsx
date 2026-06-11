import Image from 'next/image';

export default function QuemSomos() {
  return (
    <section style={{ background: '#111a13' }} className="py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Imagem dividindo a tela */}
        <div className="relative order-last lg:order-first">
          <div
            className="absolute -inset-3 rounded-[28px] opacity-25 blur-2xl"
            style={{ background: 'linear-gradient(135deg, #00A651, #135a36)' }}
          />
          <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden border border-white/10 shadow-2xl">
            <Image
              src="/quem-somos.png"
              alt="Produtor rural usando o GestSilo no campo"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {/* Selo flutuante */}
            <div
              className="absolute bottom-4 left-4 right-4 rounded-xl px-4 py-3 backdrop-blur-md"
              style={{ background: 'rgba(17,26,19,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm font-bold text-foreground">Equipe GestSilo</p>
              <p className="text-xs text-muted-foreground">Gente do agro, construindo para o agro</p>
            </div>
          </div>
        </div>

        {/* Texto */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-4 block">
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

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            O GestSilo surgiu da experiência de quem lida todo dia com a terra, com o gado e com a silagem.
            Somos gente do agro construindo tecnologia para o agro — cada funcionalidade resolve um problema
            real da fazenda, do balanço forrageiro ao controle de estoque, do talhão ao fluxo de caixa.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nosso compromisso é simples: transformar dado em decisão e deixar a gestão da propriedade tão
            sólida quanto o trabalho de quem a sustenta. Sem complicação — só o que ajuda a produzir melhor.
          </p>
        </div>
      </div>
    </section>
  );
}
