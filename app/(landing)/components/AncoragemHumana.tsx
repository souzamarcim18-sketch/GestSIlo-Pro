import { ANCORAGEM_DIFERENCIAIS } from './data';

export default function AncoragemHumana() {
  return (
    <section style={{ background: '#111a13' }} className="py-20 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        {/* Bloco A — Quem somos */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-4 block">
            Quem somos
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-5 leading-tight">
            O GestSilo nasceu no campo, não no escritório
          </h2>
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(0,196,90,0.05)', border: '1px solid rgba(0,196,90,0.15)' }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Surgiu da experiência de quem lida todo dia com a terra, com o gado e com a silagem — e conhece
              de perto a dificuldade de tomar decisão sem número confiável na mão.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Somos gente do agro construindo tecnologia para o agro. Cada funcionalidade da plataforma resolve
              um problema real da fazenda: do balanço forrageiro ao controle de estoque, do talhão ao fluxo de caixa.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nosso compromisso é simples: transformar dado em decisão e deixar a gestão da propriedade tão sólida
              quanto o trabalho de quem a sustenta. Sem complicação — só o que ajuda a produzir melhor.
            </p>
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-foreground">Equipe GestSilo</p>
              <p className="text-xs text-muted-foreground">Gente do agro, construindo para o agro</p>
            </div>
          </div>
        </div>

        {/* Bloco B — Diferenciais de campo */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 block">
            Feito para o campo brasileiro
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-5 leading-tight">
            Pensado para a realidade de quem produz
          </h2>
          <div className="space-y-4">
            {ANCORAGEM_DIFERENCIAIS.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(0,196,90,0.15)', border: '1px solid rgba(0,196,90,0.3)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#00c45a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
