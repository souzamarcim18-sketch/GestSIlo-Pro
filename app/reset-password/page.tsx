'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Home } from 'lucide-react';
import Image from 'next/image';

const BG_METAL =
  'linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 25%, #f5f5f5 50%, #d0d0d0 75%, #a8a8a8 100%)';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Valida se o usuário chegou aqui via link válido do e-mail
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        toast.error('Link inválido ou expirado. Solicite um novo.');
        router.push('/forgot-password');
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Senha redefinida com sucesso!');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao redefinir senha.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BG_METAL }}
      >
        <p style={{ color: '#023c1f' }} className="font-semibold">
          Validando link...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: BG_METAL }}
    >
      {/* Grid decorativo */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-reset" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00A651" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-reset)" />
        </svg>
      </div>

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

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo_degrad-hor.png"
            alt="GestSilo"
            width={220}
            height={55}
            className="object-contain brightness-130"
            priority
          />
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#023c1f' }}>
              Redefinir senha
            </h1>
            <p className="text-sm" style={{ color: '#4a4a4a' }}>
              Escolha uma nova senha segura para sua conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold mb-2"
                style={{ color: '#1a1a1a' }}
              >
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm"
                onFocus={(e) =>
                  (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.2)')
                }
                onBlur={(e) => (e.target.style.boxShadow = '')}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold mb-2"
                style={{ color: '#1a1a1a' }}
              >
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm"
                onFocus={(e) =>
                  (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.2)')
                }
                onBlur={(e) => (e.target.style.boxShadow = '')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,166,81,0.35)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-xs" style={{ color: '#4a4a4a' }}>
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}
