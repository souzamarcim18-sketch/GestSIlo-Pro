'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import Image from 'next/image';
import { Home } from 'lucide-react';
import { AUTH_PROFILE_FETCH_TIMEOUT_MS } from '@/lib/auth/constants';
import { authLog } from '@/lib/auth/logger';

// Fundo metálico padrão da aplicação
const BG_METAL =
  'linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 25%, #f5f5f5 50%, #d0d0d0 75%, #a8a8a8 100%)';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, profileError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [timeout, setTimeout] = useState(false);

  useEffect(() => {
    authLog('LoginPage useEffect: authLoading=', authLoading, 'user=', !!user, 'profile=', !!profile, 'profileError=', profileError);

    if (authLoading && user && !timeout) {
      console.log(`⏳ [LOGIN-PAGE] Profile still loading, setting ${AUTH_PROFILE_FETCH_TIMEOUT_MS}ms timeout...`);
      authLog('Profile still loading, setting timeout...');
      const timeoutId = window.setTimeout(() => {
        console.log('⏰ [LOGIN-PAGE] Profile loading timeout!');
        authLog('Profile loading timeout!');
        setTimeout(true);
      }, AUTH_PROFILE_FETCH_TIMEOUT_MS);

      return () => clearTimeout(timeoutId);
    }

    if (!authLoading && user && profile && !timeout) {
      authLog('Profile loaded, redirecting...');
      if (profile.perfil === 'Operador') {
        router.push('/operador');
      } else {
        router.push('/dashboard');
      }
    }

    if (timeout && (!profile || profileError)) {
      authLog('Timeout occurred and profile error or missing');
      setError('Tempo limite ao carregar seu perfil. Tente fazer login novamente.');
    }
  }, [authLoading, user, profile, profileError, timeout, router]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setTimeout(false);

      try {
        authLog('handleLogin: starting POST /api/auth/login');
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Erro ao realizar login.');
          toast.error(data.error || 'Erro ao realizar login.');
          authLog('handleLogin: API error:', data.error);
          return;
        }

        authLog('handleLogin: signIn success, waiting for AuthProvider...');
        toast.success('Login realizado com sucesso!');

        if (data.success) {
          router.refresh();
          router.push('/dashboard');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        authLog('handleLogin: caught error:', errorMessage);
        setError('Ocorreu um erro inesperado. Tente novamente.');
        toast.error('Erro ao realizar login.');
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  return (
    <div className="min-h-screen flex relative" style={{ background: BG_METAL }}>

      {/* Botão Voltar */}
      <button
        onClick={() => router.push('/')}
        aria-label="Voltar para a página inicial"
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl text-sm font-semibold hover:bg-white hover:text-primary transition-all shadow-md cursor-pointer"
        style={{ color: '#1a1a1a' }}
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span>Voltar ao Início</span>
      </button>

      {/* ===== LADO ESQUERDO — Hero ===== */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden"
        aria-hidden="true"
      >
        {/* Grid pattern verde decorativo */}
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
              <pattern id="grid-login" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00A651" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-login)" />
          </svg>
        </div>

        {/* Logo horizontal (padrão do footer/navbar) */}
        <div className="relative z-10 flex items-center">
          <Image
            src="/logo_degrad-hor.png"
            alt="GestSilo"
            width={220}
            height={55}
            className="object-contain brightness-130"
            priority
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <div className="mb-8">
            <p className="text-5xl xl:text-6xl font-extrabold leading-tight mb-8">
              <span style={{ color: '#1a1a1a' }}>
                Sua fazenda<br />
                no próximo<br />
              </span>
              <span style={{ color: '#00843D' }}>nível</span>
            </p>
            <p className="text-xl leading-relaxed max-w-md" style={{ color: '#2d2d2d' }}>
              Controle silos, talhões, frota, insumos e financeiro em um único lugar. Do campo ao escritório.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm font-medium" style={{ color: '#4a4a4a' }}>
            © 2026 GestSilo · Tecnologia para o produtor brasileiro
          </p>
        </div>
      </div>

      {/* ===== LADO DIREITO — Formulário ===== */}
      <main
        id="main-content"
        className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 sm:px-16 xl:px-24 min-h-screen relative"
      >
        {/* Card com fundo claro sobreposto ao metálico */}
        <div className="w-full max-w-md relative z-10">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center mb-10" aria-hidden="true">
            <Image
              src="/logo_degrad-hor.png"
              alt="GestSilo"
              width={200}
              height={50}
              className="object-contain brightness-130"
            />
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#023c1f' }}>
                Bem-vindo de volta
              </h1>
              <p className="text-base" style={{ color: '#4a4a4a' }}>
                Acesse sua conta para gerenciar sua propriedade
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5" noValidate>

              {/* E-mail */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#1a1a1a' }}
                >
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    aria-describedby={error ? 'form-error' : undefined}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all text-base shadow-sm"
                    onFocus={(e) => (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.2)')}
                    onBlur={(e) => (e.target.style.boxShadow = '')}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold"
                    style={{ color: '#1a1a1a' }}
                  >
                    Senha
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-sm font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: '#00843D' }}
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    aria-describedby={error ? 'form-error' : undefined}
                    className="w-full pl-12 pr-12 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all text-base shadow-sm"
                    onFocus={(e) => (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.2)')}
                    onBlur={(e) => (e.target.style.boxShadow = '')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {(error || profileError || timeout) && (
                <div
                  id="form-error"
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <svg
                    className="w-5 h-5 text-red-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-700 text-sm font-medium">
                      {error || profileError || (timeout && 'Tempo limite ao carregar seu perfil. Tente fazer login novamente.')}
                    </p>
                    {(profileError || timeout) && (
                      <p className="text-red-600/80 text-xs mt-1">
                        Contate o suporte se o problema persistir.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-4 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-2"
                style={{
                  background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(0,166,81,0.35)',
                }}
                onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar na plataforma</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8" aria-hidden="true">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm" style={{ color: '#6b6b6b' }}>ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Cadastro */}
            <div className="text-center">
              <p className="text-sm" style={{ color: '#4a4a4a' }}>
                Ainda não tem uma conta?{' '}
                <a
                  href="/register"
                  className="font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: '#00843D' }}
                >
                  Solicite seu acesso →
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs" style={{ color: '#4a4a4a' }}>
              © 2026 GestSilo · Todos os direitos reservados
            </p>
            <nav aria-label="Links institucionais" className="flex items-center justify-center gap-4 mt-2">
              <a href="/privacidade" className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#4a4a4a' }}>Privacidade</a>
              <span aria-hidden="true" style={{ color: '#9a9a9a' }}>·</span>
              <a href="/termos" className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#4a4a4a' }}>Termos de uso</a>
              <span aria-hidden="true" style={{ color: '#9a9a9a' }}>·</span>
              <a href="/suporte" className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#4a4a4a' }}>Suporte</a>
            </nav>
          </footer>

        </div>
      </main>
    </div>
  );
}
