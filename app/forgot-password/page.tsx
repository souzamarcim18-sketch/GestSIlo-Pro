'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Home, ArrowLeft } from 'lucide-react';

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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <button
        onClick={() => router.push('/')}
        aria-label="Voltar para a página inicial"
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-green-600 transition-all shadow-sm"
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span>Voltar ao Início</span>
      </button>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Back to login */}
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao login
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Recuperar senha
            </h1>
            <p className="text-gray-600 text-sm">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          {sent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
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
                  className="block text-sm font-semibold text-gray-700 mb-2"
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.15)')
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
      </div>
    </div>
  );
}
