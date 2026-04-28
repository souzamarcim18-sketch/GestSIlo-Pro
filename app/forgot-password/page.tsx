'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Home, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

// Fundo metálico padrão da aplicação
const BG_METAL =
  'linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 25%, #f5f5f5 50%, #d0d0d0 75%, #a8a8a8 100%)';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email.trim()) return;
  setLoading(true);
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), redirectUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error || 'Erro ao enviar e-mail.');
      return;
    }

    setSent(true);
    toast.success('E-mail de recuperação enviado!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao enviar e-mail.';
    toast.error(msg);
  } finally {
    setLoading(false);
  }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: BG_METAL }}
    >
      {/* Grid pattern verde decorativo */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="grid-forgot" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00A651" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-forgot)" />
        </svg>
      </div>

      {/* Botão Voltar ao Início */}
      <button
        onClick={() => router.push('/')}
        aria-label="Voltar para a página inicial"
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl text-sm font-semibold hover:bg-white hover:text-primary transition-all shadow-md cursor-pointer"
        style={{ color: '#1a1a1a' }}
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span>Voltar ao Início</span>
      </button>

      {/* Conteúdo principal */}
      <div className="w-full max-w-md relative z-10">

        {/* Logo horizontal (padrão do footer/navbar) */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/logo_degrad-hor.png"
            alt="GestSilo"
            width={220}
            height={55}
            className="object-contain brightness-130"
            priority
          />
        </div>

        {/* Card principal */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-8">

          {/* Voltar ao login */}
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
            style={{ color: '#4a4a4a' }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao login
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#023c1f' }}>
              Recuperar senha
            </h1>
            <p className="text-sm" style={{ color: '#4a4a4a' }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          {sent ? (
            <div
              className="p-4 rounded-xl text-sm border"
              style={{
                background: 'rgba(0,166,81,0.08)',
                borderColor: 'rgba(0,166,81,0.3)',
                color: '#023c1f',
              }}
            >
              <p className="font-semibold mb-1">E-mail enviado!</p>
              <p>
                Verifique sua caixa de entrada em <strong>{email}</strong> e siga
                as instruções para redefinir sua senha.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#1a1a1a' }}
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm transition-all"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.2)')
                  }
                  onBlur={(e) => (e.target.style.boxShadow = '')}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                aria-busy={loading}
                className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                style={{
                  background:
                    loading || !email.trim()
                      ? '#9CA3AF'
                      : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                  boxShadow:
                    loading || !email.trim()
                      ? 'none'
                      : '0 4px 20px rgba(0,166,81,0.35)',
                  opacity: loading || !email.trim() ? 0.7 : 1,
                }}
                onMouseOver={(e) => {
                  if (!loading && email.trim()) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Enviando...</span>
                  </>
                ) : (
                  'Enviar link de recuperação'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs" style={{ color: '#4a4a4a' }}>
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}
