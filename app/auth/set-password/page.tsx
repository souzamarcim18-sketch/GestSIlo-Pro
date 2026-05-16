'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import Image from 'next/image';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Verificar se há sessão ativa (vinda do /auth/confirm)
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Link inválido ou expirado. Solicite um novo convite.');
        router.push('/login');
      } else {
        setSessionReady(true);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message ?? 'Erro ao definir senha.');
        return;
      }

      toast.success('Senha definida com sucesso! Bem-vindo ao GestSilo Pro.');
      router.push('/dashboard');
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-metal">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-metal">
      {/* Grid decorativo */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-setpw" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--brand-green-vivid)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-setpw)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
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

        {/* Card */}
        <div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-deep">Criar sua senha</h1>
              <p className="text-sm text-muted-foreground">Defina uma senha para acessar o sistema</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2 text-foreground">
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-base shadow-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                    : <Eye className="w-4 h-4" aria-hidden="true" />
                  }
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-semibold mb-2 text-foreground">
                Confirmar senha
              </label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-base shadow-sm transition-all"
              />
            </div>

            {password && confirm && password !== confirm && (
              <p className="text-sm text-destructive">As senhas não coincidem.</p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              aria-busy={loading}
              className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: loading || !password || !confirm
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                boxShadow: loading || !password || !confirm
                  ? 'none'
                  : '0 4px 20px rgba(0,166,81,0.35)',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Salvando...</span>
                </>
              ) : (
                'Entrar no GestSilo Pro'
              )}
            </button>
          </form>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}
