'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Wheat,
  Map as MapIcon,
  Tractor,
  Calculator,
  DollarSign,
  Beef,
  FlaskConical,
  BarChart3,
} from 'lucide-react';

// Fundo cinza metálico padrão da página
const BG_METAL =
  'linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 25%, #f5f5f5 50%, #d0d0d0 75%, #a8a8a8 100%)';

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
    <div className="min-h-screen bg-white dark:bg-sidebar flex flex-col">

      {/* ===== NAVBAR ===== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-gray-400 dark:border-white/10 shadow-sm"
        style={{ background: BG_METAL }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_degrad-hor.png"
              alt="GestSilo"
              width={180}
              height={45}
              className="object-contain brightness-130"
              priority
            />
          </div>

          <nav
            className="hidden lg:flex items-center gap-8 text-sm font-semibold dark:text-muted-foreground"
            style={{ color: '#1a1a1a' }}
          >
            <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#beneficios" className="hover:text-primary transition-colors">Benefícios</a>
            <a href="#planos" className="hover:text-primary transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/login')}
              className="hidden md:block text-sm font-semibold dark:text-muted-foreground hover:text-primary transition-colors"
              style={{ color: '#1a1a1a' }}
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
      <section
        className="relative min-h-[80vh] flex items-center overflow-hidden pt-20"
        style={{ background: BG_METAL }}
      >
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

            {/* ===== COLUNA ESQUERDA — Texto ===== */}
            <div className="flex flex-col justify-center">
              <div className="mb-8">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: 'rgba(0,166,81,0.15)', color: '#00843D', border: '1px solid rgba(0,166,81,0.3)' }}
                >
                  Plataforma feita para o pecuarista e agricultor brasileiro
                </span>
              </div>

              <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.08] tracking-tight mb-8">
                <span style={{ color: '#1a1a1a' }}>
                  Planeje, gerencie e<br />maximize a{' '}
                </span>
                <span className="relative inline-block" style={{ color: '#00843D' }}>
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
                <span style={{ color: '#2d2d2d' }}>da sua propriedade</span>
              </h1>

              <p
                className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl"
                style={{ color: '#2d2d2d' }}
              >
                Sua propriedade merece mais do que cadernos e planilhas.
                Controle sua silagem, suas lavouras, sua frota e seus insumos em uma plataforma feita para o
                produtor brasileiro — do campo à gestão, com poucos cliques.
              </p>
            </div>

            {/* ===== COLUNA DIREITA — Imagem ===== */}
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
      <section
        id="funcionalidades"
        className="py-24 px-6 dark:bg-sidebar"
        style={{ background: BG_METAL }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-extrabold mb-4 dark:text-foreground"
              style={{ color: '#023c1f' }}
            >
              O sistema que sua fazenda precisa
            </h2>
            <p
              className="text-lg max-w-xl mx-auto dark:text-muted-foreground"
              style={{ color: '#1a1a1a' }}
            >
              Uma plataforma completa para gestão. Do campo à administração.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { Icon: Wheat, title: 'Gestão de Silagens', desc: 'Tenha controle total das suas silagens em tempo real — acompanhe entradas, saídas, volumes armazenados e a qualidade de cada lote, evitando perdas e garantindo forragem de alto valor nutricional para o seu rebanho.', color: '#023c1f', border: '#BBF7D0', iconColor: '#BBF7D0' },
              { Icon: MapIcon, title: 'Gestão de Lavouras', desc: 'Gerencie suas áreas, acompanhe suas operações agrícolas, tenha o histórico de cultivos e produtividade de suas lavouras.', color: '#023c1f', border: '#BFDBFE', iconColor: '#BFDBFE' },
              { Icon: Tractor, title: 'Gestão de Máquinas e Implementos', desc: 'Controle as manutenções, os abastecimentos, as horas trabalhadas e os custos operacionais.', color: '#023c1f', border: '#FED7AA', iconColor: '#FED7AA' },
              { Icon: Calculator, title: 'Calculadoras', desc: 'Tenha nas suas mãos calculadoras que te ajudarão a tomar decisões em relação à compras de fertilizantes e calcário.', color: '#023c1f', border: '#E9D5FF', iconColor: '#E9D5FF' },
              { Icon: DollarSign, title: 'Gestão Financeira', desc: 'Acompanhe as receitas, as despesas, da sua propriedade com formatação em BRL e cálculos automáticos.', color: '#023c1f', border: '#FEF08A', iconColor: '#FEF08A' },
              { Icon: Beef, title: 'Planejamento de silagens', desc: 'Planeje a necessidade de volume de silagens e de áreas de plantios, de acordo com seu sistema de produção e seu rebanho.', color: '#023c1f', border: '#FECACA', iconColor: '#FECACA' },
              { Icon: FlaskConical, title: 'Gestão de Insumos', desc: 'Organize o estoque de fertilizantes, defensivos, sementes e outros itens, com controle de entradas, saídas e custos.', color: '#023c1f', border: '#A5F3FC', iconColor: '#A5F3FC' },
              { Icon: BarChart3, title: 'Relatórios & Simulador', desc: 'Gere relatórios consolidados por período e simule cenários agrícolas para apoiar suas decisões estratégicas.', color: '#023c1f', border: '#DDD6FE', iconColor: '#DDD6FE' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-6 border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-default dark:bg-muted dark:border-border"
                style={{ background: item.color, borderColor: item.border }}
              >
                <div className="mb-4">
                  <item.Icon size={40} strokeWidth={1.8} color={item.iconColor} />
                </div>
                <h3 className="font-bold text-white dark:text-foreground text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-300 dark:text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section
        id="beneficios"
        className="py-24 px-6"
        style={{ background: BG_METAL }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span
              className="text-xs font-bold uppercase tracking-widest mb-4 block"
              style={{ color: '#00843D' }}
            >
              Por que o GestSilo?
            </span>
            <h2
              className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight"
              style={{ color: '#023c1f' }}
            >
              Decisões mais inteligentes,<br />resultado no campo
            </h2>
            <div className="space-y-5">
              {[
                { icon: '⚡', title: 'Agilidade', desc: 'Acesse qualquer informação em segundos, do celular ou computador.' },
                { icon: '📍', title: 'Rastreabilidade', desc: 'Histórico completo de cada talhão, silo e máquina da sua fazenda.' },
                { icon: '💰', title: 'Redução de custos', desc: 'Identifique gargalos e reduza desperdícios com dados precisos.' },
                { icon: '🔒', title: 'Segurança', desc: 'Seus dados protegidos com criptografia e backup automático.' },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
                    style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.25)' }}
                  >
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1" style={{ color: '#023c1f' }}>{b.title}</h4>
                    <p className="text-sm" style={{ color: '#2d2d2d' }}>{b.desc}</p>
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
      <section
        id="planos"
        className="py-24 px-6"
        style={{ background: BG_METAL }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-extrabold mb-4 dark:text-foreground"
              style={{ color: '#023c1f' }}
            >
              Planos para todo tamanho de fazenda
            </h2>
            <p
              className="text-lg dark:text-muted-foreground"
              style={{ color: '#1a1a1a' }}
            >
              Comece grátis e escale conforme crescer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: 'Grátis',
                period: '',
                desc: 'Para pequenos produtores',
                features: ['1 silo', 'Até 5 talhões', 'Relatórios básicos', 'Suporte por e-mail'],
                cta: 'Começar grátis',
                highlight: false,
              },
              {
                name: 'Pro',
                price: 'R$ 197',
                period: '/mês',
                desc: 'Para produtores em crescimento',
                features: ['Silos ilimitados', 'Talhões ilimitados', 'Módulo financeiro', 'Frota & maquinário', 'Relatórios avançados', 'Suporte prioritário'],
                cta: 'Assinar Pro',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Sob consulta',
                period: '',
                desc: 'Para grandes operações',
                features: ['Tudo do Pro', 'Multi-fazendas', 'API & integrações', 'Gerente de conta dedicado', 'Treinamento presencial'],
                cta: 'Falar com vendas',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 relative transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlight ? 'shadow-2xl scale-105' : 'bg-white border-gray-200'
                }`}
                style={
                  plan.highlight
                    ? { background: 'linear-gradient(145deg, #00A651, #00843D)', borderColor: '#00843D', color: 'white' }
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
                <h3
                  className="font-bold text-xl mb-1"
                  style={{ color: plan.highlight ? '#ffffff' : '#023c1f' }}
                >
                  {plan.name}
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: plan.highlight ? 'rgba(255,255,255,0.85)' : '#4a4a4a' }}
                >
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span
                    className="text-4xl font-extrabold"
                    style={{ color: plan.highlight ? '#ffffff' : '#023c1f' }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className="text-sm ml-1"
                      style={{ color: plan.highlight ? 'rgba(255,255,255,0.85)' : '#4a4a4a' }}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: plan.highlight ? '#ffffff' : '#00843D' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.95)' : '#2d2d2d' }}>
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
      <section
        className="py-24 px-6 text-center relative overflow-hidden"
        style={{ background: BG_METAL }}
      >
        {/* Grid decorativo sutil */}
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
          <h2
            className="text-4xl md:text-5xl font-extrabold mb-6"
            style={{ color: '#023c1f' }}
          >
            Pronto para transformar<br />sua gestão agrícola?
          </h2>
          <p
            className="text-lg mb-10"
            style={{ color: '#2d2d2d' }}
          >
            Junte-se a mais de 500 produtores que já gerenciam suas fazendas com mais eficiência e controle.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-10 py-5 font-bold text-lg rounded-2xl shadow-2xl transition-all duration-200 hover:-translate-y-1 text-white"
            style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
          >
            Começar agora — é grátis →
          </button>
          <p className="text-sm mt-4" style={{ color: '#4a4a4a' }}>
            Sem cartão de crédito. Sem compromisso.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 dark:bg-background text-gray-400 dark:text-muted-foreground py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: '#00A651' }}>Gest</span>
            <span className="font-bold" style={{ color: '#6B8E23' }}>Silo</span>
            <span className="text-gray-600 dark:text-muted-foreground/60 ml-2 text-sm">© 2026 · Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-white dark:hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white dark:hover:text-foreground transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-white dark:hover:text-foreground transition-colors">Suporte</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
