'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Wheat,
  Tractor,
  Calculator,
  DollarSign,
  FlaskConical,
  Package,
  NotebookPen,
  BarChart3,
  Phone,
  Instagram,
  Mail,
  Sprout,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const checkUserRole = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('perfil')
          .eq('id', user.id)
          .single();

        if (profile?.perfil === 'Operador') {
          router.push('/operador');
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ===== NAVBAR ===== */}
      <header className="bg-metal fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_degrad-hor.png"
              alt="GestSilo"
              width={180}
              height={45}
              className="object-contain brightness-110"
              priority
            />
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-foreground">
            <a href="#funcionalidades" className="hover:text-brand-primary transition-colors">Funcionalidades</a>
            <a href="#beneficios" className="hover:text-brand-primary transition-colors">Benefícios</a>
            <a href="#planos" className="hover:text-brand-primary transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/login')}
              className="hidden md:block text-sm font-semibold text-foreground hover:text-brand-primary transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => router.push('/register')}
              className="text-sm font-semibold text-white px-4 md:px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #135a36, #00843D)' }}
            >
              Solicitar acesso
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="bg-metal relative min-h-[80vh] flex items-center overflow-hidden pt-20">
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
                  Plataforma feita para o pecuarista e agricultor brasileiro
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

              <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl text-foreground/80">
                Sua propriedade merece mais do que cadernos e planilhas.
                Controle sua silagem, suas lavouras, sua frota e seus insumos em uma plataforma feita para o
                produtor brasileiro — do campo à gestão, com poucos cliques.
              </p>
            </div>

            {/* COLUNA DIREITA — Imagem */}
            <div className="relative hidden lg:flex items-center justify-end">
              <div className="relative w-full max-w-md">
                <div
                  className="absolute -inset-4 rounded-[40px] rotate-3 opacity-25 z-0"
                  style={{ background: 'linear-gradient(135deg, #36875d, #205b0d)' }}
                />
                <div className="relative z-10 rounded-[32px] overflow-hidden shadow-2xl w-full max-w-md" style={{ aspectRatio: '4/3' }}>
                  <Image
                    src="/imagem-hero.webp?v=1"
                    alt="Gestão agrícola com GestSilo"
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/3 z-10"
                    style={{ background: 'linear-gradient(to top, rgba(0,132,61,0.35), transparent)' }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== FUNCIONALIDADES ===== */}
      <section id="funcionalidades" className="bg-metal py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-brand-deep">
              O sistema que a sua fazenda precisa
            </h2>
            <p className="text-lg max-w-xl mx-auto text-foreground">
              Uma plataforma completa para gestão. Do campo à administração.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { Icon: Wheat, title: 'Gestão de Silagens', desc: 'Tenha controle total das suas silagens em tempo real — acompanhe entradas, saídas, volumes armazenados e a qualidade de cada lote, evitando perdas e garantindo forragem de alto valor nutricional para o seu rebanho.', border: '#BBF7D0', iconColor: '#BBF7D0' },
              { Icon: Sprout, title: 'Gestão de Lavouras', desc: 'Gerencie suas áreas, acompanhe suas operações agrícolas, tenha o histórico de cultivos e produtividade de suas lavouras.', border: '#BFDBFE', iconColor: '#BFDBFE' },
              { Icon: Tractor, title: 'Gestão de Máquinas e Implementos', desc: 'Controle as manutenções, os abastecimentos, as horas trabalhadas e os custos operacionais.', border: '#FED7AA', iconColor: '#FED7AA' },
              { Icon: Calculator, title: 'Calculadoras', desc: 'Tenha nas suas mãos calculadoras que te ajudarão a tomar decisões em relação à compras de fertilizantes e calcário.', border: '#E9D5FF', iconColor: '#E9D5FF' },
              { Icon: DollarSign, title: 'Gestão Financeira', desc: 'Acompanhe as receitas, as despesas, da sua propriedade com formatação em BRL e cálculos automáticos.', border: '#FEF08A', iconColor: '#FEF08A' },
              { Icon: NotebookPen, title: 'Planejamento de silagens', desc: 'Planeje a necessidade de volume de silagens e de áreas de plantios, de acordo com seu sistema de produção e seu rebanho.', border: '#FECACA', iconColor: '#FECACA' },
              { Icon: Package, title: 'Gestão de Insumos', desc: 'Organize o estoque de fertilizantes, defensivos, sementes e outros itens, com controle de entradas, saídas e custos.', border: '#A5F3FC', iconColor: '#A5F3FC' },
              { Icon: BarChart3, title: 'Relatórios & Simulador', desc: 'Gere relatórios consolidados por período e simule cenários agrícolas para apoiar suas decisões estratégicas.', border: '#DDD6FE', iconColor: '#DDD6FE' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-6 border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-default bg-brand-deep"
                style={{ borderColor: item.border }}
              >
                <div className="mb-4">
                  <item.Icon size={40} strokeWidth={1.8} color={item.iconColor} />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section id="beneficios" className="bg-metal py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-4 block text-brand-primary">
              Por que utilizar o GestSilo na sua propriedade?
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-brand-deep">
              Decisões mais inteligentes,<br />resultado no campo!
            </h2>
            <div className="space-y-5">
              {[
                { icon: '⚡', title: 'Agilidade', desc: 'Acesse qualquer informação em segundos, do celular ou do computador.' },
                { icon: '📍', title: 'Rastreabilidade', desc: 'Histórico completo de cada silo, de cada lavoura e das máquinas da sua fazenda.' },
                { icon: '💰', title: 'Gestão de custos', desc: 'Identifique os gargalos e reduza os desperdícios, através de dados precisos.' },
                { icon: '🔒', title: 'Segurança', desc: 'Seus dados protegidos com criptografia e backup automático.' },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm border"
                    style={{
                      background: 'rgba(0,166,81,0.15)',
                      borderColor: 'rgba(0,166,81,0.25)',
                    }}
                  >
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-brand-deep">{b.title}</h4>
                    <p className="text-sm text-foreground/80">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="rounded-3xl p-8 shadow-2xl"
              style={{ background: 'linear-gradient(145deg, #00A651, #00843D)' }}
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Silos ativos', value: '12', unit: 'unidades' },
                  { label: 'Estoque total', value: '8.400', unit: 'toneladas' },
                  { label: 'Talhões mapeados', value: '47', unit: 'áreas' },
                  { label: 'Economia gerada', value: 'R$ 120k', unit: 'este ano' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-white/80 text-xs font-medium mb-1">{stat.label}</p>
                    <p className="text-white text-2xl font-extrabold">{stat.value}</p>
                    <p className="text-white/70 text-xs">{stat.unit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-white/10 rounded-2xl p-4">
                <p className="text-white/80 text-xs font-medium mb-2">Produtividade do mês</p>
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-white/40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div
              className="absolute -top-4 -right-4 text-xs font-bold px-4 py-2 rounded-full shadow-lg"
              style={{ background: '#FEF08A', color: '#854d0e' }}
            >
              🏆 #1 no agro
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section id="planos" className="bg-metal py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-brand-deep">
              O plano certo para cada fazenda!
            </h2>
            <p className="text-lg text-foreground">
              Grátis para começar. Sem surpresa e sem limites para crescer!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Start',
                price: 'Grátis',
                period: '',
                desc: 'Para produtores que querem iniciar e conhecer',
                features: ['1 silo', 'Até 3 talhões', 'Suporte por e-mail'],
                cta: 'Começar grátis',
                highlight: false,
              },
              {
                name: 'Pro',
                price: 'R$ 49',
                period: '/mês',
                desc: 'Para gestão profissional da propriedade',
                features: ['Silos ilimitados', 'Talhões ilimitados', 'Planejador de silagem', 'Módulo financeiro', 'Gestão de Frotas', 'Calculadoras de Calcário e de Fertilizantes', 'Relatórios avançados', 'Suporte prioritário'],
                cta: 'Assinar Pro',
                highlight: true,
              },
              {
                name: 'Max',
                price: 'R$ 119',
                period: '/mês',
                desc: 'Para grandes operações',
                features: ['Tudo do Pro', 'Multi-fazendas', 'Assessoria agronômica exclusiva'],
                cta: 'Falar com vendas',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 relative transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlight ? 'shadow-2xl scale-105' : 'bg-card border-border'
                }`}
                style={
                  plan.highlight
                    ? { background: 'linear-gradient(145deg, #00A651, #00843D)', borderColor: '#00843D' }
                    : {}
                }
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full shadow"
                    style={{ background: '#FEF08A', color: '#854d0e' }}
                  >
                    ⭐ Mais popular
                  </div>
                )}
                <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-brand-deep'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-brand-deep'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg
                        className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-brand-primary'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      <span className={plan.highlight ? 'text-white/95' : 'text-foreground/85'}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/register')}
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
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-metal py-24 px-6 text-center relative overflow-hidden">
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
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-brand-deep">
            Pronto para gerenciar<br />suas silagens e sua propriedade?
          </h2>
          <p className="text-lg mb-10 text-foreground/80">
            Mais controle. Menos perdas. Mais resultados para seu rebanho e para sua propriedade.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-10 py-5 font-bold text-lg rounded-2xl shadow-2xl transition-all duration-200 hover:-translate-y-1 text-white"
            style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
          >
            Solicitar meu acesso
          </button>
          <p className="text-sm mt-4 text-muted-foreground">
            Solicite seu primeiro acesso, conheça e melhore sua gestão.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-metal py-12 px-6 border-t border-border/60">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 items-start">

          {/* COLUNA 1 — Logo + copyright */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Image
              src="/logo_degrad-hor.png"
              alt="GestSilo"
              width={200}
              height={50}
              className="object-contain"
            />
            <span className="text-sm font-medium text-foreground">
              © 2026 · Todos os direitos reservados
            </span>
          </div>

          {/* COLUNA 2 — Contatos */}
          <div className="flex flex-col items-center md:items-start gap-3 md:border-l md:border-border md:pl-8">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-1 text-brand-deep">
              Contatos
            </h4>

            <a
              href="https://wa.me/5531990875346"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-brand-primary transition-colors"
              aria-label="WhatsApp"
            >
              <Phone size={16} />
              <span>(31) 99087-5346</span>
            </a>

            <a
              href="https://instagram.com/gestsilo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-brand-primary transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={16} />
              <span>@gestsilo</span>
            </a>

            <a
              href="mailto:gestsilo.app@gmail.com"
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-brand-primary transition-colors"
              aria-label="E-mail"
            >
              <Mail size={16} />
              <span>gestsilo.app@gmail.com</span>
            </a>
          </div>

          {/* COLUNA 3 — Links institucionais */}
          <div className="flex flex-col items-center md:items-start gap-3 md:border-l md:border-border md:pl-8">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-1 text-brand-deep">
              Institucional
            </h4>

            <a href="#" className="text-sm font-medium text-foreground hover:text-brand-primary transition-colors">
              Privacidade
            </a>
            <a href="#" className="text-sm font-medium text-foreground hover:text-brand-primary transition-colors">
              Termos de uso
            </a>
          </div>

        </div>
      </footer>

    </div>
  );
}
