'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// ─── Modal de Login ────────────────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo.png" alt="GestSilo" width={44} height={44} className="rounded-xl" referrerPolicy="no-referrer" />
          <div>
            <span className="font-bold text-lg" style={{ color: '#00A651' }}>Gest</span>
            <span className="font-bold text-lg" style={{ color: '#6B8E23' }}>Silo</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Acessar plataforma</h2>
        <p className="text-gray-500 text-sm mb-8">Entre com suas credenciais para continuar</p>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all text-sm"
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.15)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Senha</label>
              <a href="/forgot-password" className="text-xs font-medium" style={{ color: '#00A651' }}>
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all text-sm"
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.15)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(0,166,81,0.35)',
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </>
            ) : (
              <>
                Entrar na plataforma
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          Ainda não tem conta?{' '}
          <a href="/register" className="font-semibold" style={{ color: '#00A651' }}>
            Solicite seu acesso
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Dados ─────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: '🌾',
    title: 'Gestão de Silos',
    desc: 'Controle entradas, saídas e estoques de grãos em tempo real. Saiba exatamente o que tem em cada silo.',
  },
  {
    icon: '🗺️',
    title: 'Talhões e Safras',
    desc: 'Mapeie seus talhões, registre atividades de campo e acompanhe o desempenho de cada safra.',
  },
  {
    icon: '🚜',
    title: 'Frota e Maquinário',
    desc: 'Controle manutenções, abastecimentos e horas trabalhadas de toda sua frota agrícola.',
  },
  {
    icon: '💰',
    title: 'Financeiro Integrado',
    desc: 'Contas a pagar, receber, fluxo de caixa e relatórios de custo por talhão e por safra.',
  },
  {
    icon: '📦',
    title: 'Controle de Insumos',
    desc: 'Estoque de defensivos, fertilizantes e sementes integrado às ordens de serviço de campo.',
  },
  {
    icon: '📊',
    title: 'Relatórios e Indicadores',
    desc: 'Dashboards com produtividade, margem, custo por hectare e muito mais para decisões certeiras.',
  },
];

const testimonials = [
  {
    name: 'Carlos Mendonça',
    role: 'Produtor de soja e milho · 1.200 ha · MT',
    text: 'Com o GestSilo, reduzi o tempo de gestão em 60% e aumentei minha margem em quase 8 pontos percentuais na última safra.',
    avatar: 'CM',
  },
  {
    name: 'Ana Paula Rodrigues',
    role: 'Gestora administrativa · Fazenda Boa Esperança · GO',
    text: 'Finalmente consegui integrar o campo com o financeiro. O fluxo de caixa em tempo real mudou nossa tomada de decisão.',
    avatar: 'AP',
  },
  {
    name: 'Roberto Silveira',
    role: 'Produtor de algodão e milho · 3.500 ha · BA',
    text: 'O controle de silos é impecável. Antes perdia grãos por falta de rastreabilidade. Hoje sei tudo em tempo real.',
    avatar: 'RS',
  },
];

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const router = (await import('next/navigation')).useRouter;
      }
    };

    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GestSilo" width={40} height={40} className="rounded-xl" referrerPolicy="no-referrer" />
            <span className="font-bold text-xl">
              <span style={{ color: scrolled ? '#00A651' : 'white' }}>Gest</span>
              <span style={{ color: scrolled ? '#6B8E23' : 'rgba(255,255,255,0.7)' }}>Silo</span>
            </span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8">
            {['Funcionalidades', 'Como funciona', 'Depoimentos'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm font-medium transition-colors"
                style={{ color: scrolled ? '#374151' : 'rgba(255,255,255,0.85)' }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Botões */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{
                color: scrolled ? '#00A651' : 'white',
                border: `2px solid ${scrolled ? '#00A651' : 'rgba(255,255,255,0.5)'}`,
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #00A651, #00843D)', boxShadow: '0 4px 15px rgba(0,166,81,0.4)' }}
            >
              Começar grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Foto de fundo */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=85&auto=format&fit=crop"
            alt="Lavoura"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay gradiente */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(0,60,20,0.85) 0%, rgba(0,100,40,0.7) 50%, rgba(0,40,15,0.75) 100%)' }}
          />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-15 backdrop-blur-sm border border-white border-opacity-25 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-sm font-medium">Sistema de gestão agrícola inteligente</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
            Gerencie sua fazenda<br />
            <span style={{ color: '#7EE89A' }}>com inteligência</span>
          </h1>

          <p className="text-xl text-green-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Do controle de silos ao financeiro da propriedade — tudo integrado em uma única plataforma feita para o produtor rural brasileiro.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => setShowLogin(true)}
              className="w-full sm:w-auto px-8 py-4 text-white font-bold text-lg rounded-2xl transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #00A651, #00843D)',
                boxShadow: '0 8px 30px rgba(0,166,81,0.5)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Começar gratuitamente →
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="w-full sm:w-auto px-8 py-4 font-bold text-lg rounded-2xl transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '2px solid rgba(255,255,255,0.4)',
                color: 'white',
                backdropFilter: 'blur(8px)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            >
              Ver demonstração
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '+500', label: 'Produtores' },
              { value: '+2M ha', label: 'Gerenciados' },
              { value: '4.9★', label: 'Avaliação' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                <div className="text-green-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seta scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-24 px-6" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(0,166,81,0.1)', color: '#00A651' }}>
              Funcionalidades
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tudo que sua propriedade precisa
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Módulos integrados para cobrir cada aspecto da gestão agrícola moderna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6"
                  style={{ background: 'rgba(0,166,81,0.08)' }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ──────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(0,166,81,0.1)', color: '#00A651' }}>
              Como funciona
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simples de usar, poderoso nos resultados</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Em 3 passos você já está gerenciando sua fazenda de forma profissional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Cadastre sua propriedade', desc: 'Informe os dados da fazenda, talhões e silos. O processo leva menos de 10 minutos.' },
              { step: '02', title: 'Registre as operações', desc: 'Lance atividades de campo, movimentações de estoque e transações financeiras com facilidade.' },
              { step: '03', title: 'Tome decisões com dados', desc: 'Acesse dashboards, relatórios e indicadores em tempo real de qualquer dispositivo.' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ────────────────────────────────────────────────────── */}
      <section id="depoimentos" className="py-24 px-6" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(0,166,81,0.1)', color: '#00A651' }}>
              Depoimentos
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Quem usa, aprova</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Produtores de todo o Brasil transformaram a gestão de suas fazendas com o GestSilo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                {/* Estrelas */}
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <svg key={i} className="w-4 h-4" style={{ color: '#F59E0B' }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #00A651, #6B8E23)' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00A651 0%, #00843D 50%, #1a5c2a 100%)' }}>
        {/* Padrão de fundo */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="2" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Pronto para transformar a gestão da sua fazenda?
          </h2>
          <p className="text-green-100 text-xl mb-10">
            Comece gratuitamente. Sem cartão de crédito. Suporte em português.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowLogin(true)}
              className="w-full sm:w-auto px-10 py-5 bg-white font-bold text-lg rounded-2xl transition-all duration-200"
              style={{ color: '#00A651', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Criar conta gratuita →
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="w-full sm:w-auto px-10 py-5 font-bold text-lg rounded-2xl text-white transition-all"
              style={{ border: '2px solid rgba(255,255,255,0.5)', background: 'transparent' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Já tenho conta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="GestSilo" width={36} height={36} className="rounded-lg opacity-80" referrerPolicy="no-referrer" />
              <span className="font-bold text-white">
                <span style={{ color: '#00A651' }}>Gest</span>
                <span style={{ color: '#6B8E23' }}>Silo</span>
              </span>
            </div>
            <div className="flex gap-8">
              {['Privacidade', 'Termos de uso', 'Suporte', 'Contato'].map((link) => (
                <a key={link} href="#" className="text-sm hover:text-white transition-colors">{link}</a>
              ))}
            </div>
            <p className="text-sm">© 2026 GestSilo. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
