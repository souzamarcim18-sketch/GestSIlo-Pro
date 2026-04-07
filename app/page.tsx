'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
    }
  }, [router]);

  useEffect(() => {
    window.scrollTo(0, 0);
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ===== NAVBAR ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#e8f5e9]/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GestSilo" width={40} height={40} className="rounded-xl shadow-md object-contain" />
            <div>
              <span className="font-bold text-lg" style={{ color: '#00A651' }}>Gest</span>
              <span className="font-bold text-lg" style={{ color: '#6B8E23' }}>Silo</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-green-600 transition-colors">Funcionalidades</a>
            <a href="#beneficios" className="hover:text-green-600 transition-colors">Benefícios</a>
            <a href="#depoimentos" className="hover:text-green-600 transition-colors">Depoimentos</a>
            <a href="#planos" className="hover:text-green-600 transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/login')}
              className="hidden md:block text-sm font-semibold text-gray-600 hover:text-green-600 transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => router.push('/register')}
              className="text-sm font-semibold text-white px-4 md:px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
            >
              Solicitar acesso
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden pt-20" style={{ background: '#e8f5e9' }}>

        {/* Grid pattern */}
        <div className="absolute left-0 top-0 h-full w-full z-0 opacity-15">
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

              {/* Logo no Hero */}
              <div className="mb-8">
                <Image src="/logo.png" alt="GestSilo" width={80} height={80} className="rounded-2xl shadow-xl object-contain" />
              </div>

              {/* Título */}
              <h1 className="text-5xl xl:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-6">
                Planeje, gerencie e<br />
                maximize a{' '}
                <span className="relative inline-block" style={{ color: '#00A651' }}>
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
                      stroke="#00A651"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.5"
                    />
                  </svg>
                </span>
                <br />
                <span className="text-gray-700">da sua propriedade</span>
              </h1>

              {/* Subtítulo */}
              <p className="text-base md:text-[17px] text-gray-500 leading-relaxed mb-8 max-w-xl">
                Sua propriedade merece mais do que cadernos e planilhas. Adotar tecnologia nunca foi tão simples.
                Controle sua silagem, suas lavouras, sua frota e seus insumos em uma plataforma feita para o
                produtor brasileiro — do campo à gestão, com poucos cliques.
              </p>

            </div>

            {/* ===== COLUNA DIREITA — Imagem ===== */}
            <div className="relative hidden lg:flex items-center justify-end">
              <div className="relative w-full max-w-md">

                {/* Blob decorativo atrás da imagem */}
                <div
                  className="absolute -inset-4 rounded-[40px] rotate-3 opacity-20 z-0"
                  style={{ background: 'linear-gradient(135deg, #00A651, #6B8E23)' }}
                />

                {/* Imagem principal */}
                <div className="relative z-10 rounded-[32px] overflow-hidden shadow-2xl w-full max-w-md" style={{ aspectRatio: '4/3' }}>
                  <Image
                    src="/imagem-hero.png"
                    alt="Gestão agrícola com GestSilo"
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                  {/* Overlay verde no rodapé da imagem */}
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
      <section id="funcionalidades" className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Tudo que sua fazenda precisa</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Uma plataforma completa para gestão do campo à administração.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🌾',
                title: 'Silos & Estoque',
                desc: 'Monitore volumes, entradas, saídas e qualidade dos grãos armazenados em tempo real.',
                color: '#F0FDF4',
                border: '#BBF7D0',
              },
              {
                icon: '🗺️',
                title: 'Talhões',
                desc: 'Gerencie áreas, culturas, histórico de plantio e produtividade por talhão.',
                color: '#EFF6FF',
                border: '#BFDBFE',
              },
              {
                icon: '🚜',
                title: 'Frota & Maquinário',
                desc: 'Controle manutenções, abastecimentos, horas trabalhadas e custos operacionais.',
                color: '#FFF7ED',
                border: '#FED7AA',
              },
              {
                icon: '📊',
                title: 'Financeiro',
                desc: 'Acompanhe receitas, despesas, DRE e fluxo de caixa da sua propriedade.',
                color: '#FDF4FF',
                border: '#E9D5FF',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-6 border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-default"
                style={{ background: item.color, borderColor: item.border }}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section
        id="beneficios"
        className="py-24 px-6"
        style={{ background: 'linear-gradient(160deg, #f0fdf4, #ffffff)' }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-green-600 mb-4 block">
              Por que o GestSilo?
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
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
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'rgba(0,166,81,0.1)' }}
                  >
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{b.title}</h4>
                    <p className="text-gray-500 text-sm">{b.desc}</p>
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
                  <div key={stat.label} className="bg-white bg-opacity-15 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-green-100 text-xs font-medium mb-1">{stat.label}</p>
                    <p className="text-white text-2xl font-extrabold">{stat.value}</p>
                    <p className="text-green-200 text-xs">{stat.unit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-white bg-opacity-10 rounded-2xl p-4">
                <p className="text-green-100 text-xs font-medium mb-2">Produtividade do mês</p>
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-white bg-opacity-40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              🏆 #1 no agro
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section id="depoimentos" className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">O que dizem nossos produtores</h2>
            <p className="text-gray-500">Resultados reais de quem já usa o GestSilo Pro</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Carlos Mendes',
                role: 'Produtor de soja · MT',
                text: 'Antes eu controlava tudo em planilha. Hoje sei o estoque de cada silo em tempo real pelo celular. O GestSilo mudou minha operação.',
                avatar: 'CM',
              },
              {
                name: 'Ana Paula Silva',
                role: 'Gestora agrícola · GO',
                text: 'O módulo financeiro é incrível. Consegui identificar onde estava perdendo dinheiro e reduzi 18% dos custos em 3 meses.',
                avatar: 'AP',
              },
              {
                name: 'Roberto Farias',
                role: 'Fazendeiro · MS',
                text: 'Minha frota de máquinas estava me custando fortunas em manutenção corretiva. Com o GestSilo, passei para preventiva e economizei muito.',
                avatar: 'RF',
              },
            ].map((dep) => (
              <div key={dep.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">&quot;{dep.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
                  >
                    {dep.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{dep.name}</p>
                    <p className="text-gray-400 text-xs">{dep.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section
        id="planos"
        className="py-24 px-6"
        style={{ background: 'linear-gradient(160deg, #f0fdf4, #ffffff)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Planos para todo tamanho de fazenda</h2>
            <p className="text-gray-500">Comece grátis e escale conforme crescer</p>
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
                  plan.highlight
                    ? 'border-green-500 shadow-2xl scale-105'
                    : 'border-gray-100 bg-white'
                }`}
                style={plan.highlight ? { background: 'linear-gradient(145deg, #00A651, #00843D)', color: 'white' } : {}}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full shadow">
                    ⭐ Mais popular
                  </div>
                )}
                <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlight ? 'text-green-100' : 'text-gray-400'}`}>{plan.desc}</p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  {plan.period && (
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-green-200' : 'text-gray-400'}`}>{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-green-200' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      <span className={plan.highlight ? 'text-green-50' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/register')}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-white text-green-700 hover:bg-green-50'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={!plan.highlight ? { background: 'linear-gradient(135deg, #00A651, #00843D)' } : {}}
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
        className="py-24 px-6 text-center"
        style={{ background: 'linear-gradient(145deg, #00A651 0%, #00843D 60%, #1a5c2a 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Pronto para transformar<br />sua gestão agrícola?
          </h2>
          <p className="text-green-100 text-lg mb-10">
            Junte-se a mais de 500 produtores que já gerenciam suas fazendas com mais eficiência e controle.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-10 py-5 bg-white font-bold text-lg rounded-2xl shadow-2xl transition-all duration-200 hover:-translate-y-1"
            style={{ color: '#00843D' }}
          >
            Começar agora — é grátis →
          </button>
          <p className="text-green-200 text-sm mt-4">Sem cartão de crédito. Sem compromisso.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: '#00A651' }}>Gest</span>
            <span className="font-bold" style={{ color: '#6B8E23' }}>Silo</span>
            <span className="text-gray-600 ml-2 text-sm">© 2026 · Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
