'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import Image from 'next/image';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { AuthPageWrapper } from '@/components/auth/AuthPageWrapper';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLabel } from '@/components/auth/AuthLabel';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    // getSession() é local (não faz roundtrip de rede) — garante que a sessão
    // recém estabelecida via signInWithPassword já esteja disponível
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Sessão inválida. Faça login novamente.');
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
      const { error } = await supabase.auth.updateUser({
        password,
        data: { primeiro_acesso: false },
      });

      if (error) {
        toast.error(error.message ?? 'Erro ao definir senha.');
        return;
      }

      // Força refresh do JWT para que primeiro_acesso: false seja refletido imediatamente
      const { data: { session } } = await supabase.auth.refreshSession();

      toast.success('Senha definida com sucesso! Bem-vindo ao GestSilo.');

      // Redireciona por perfil
      const perfil = session?.user?.user_metadata?.perfil || session?.user?.app_metadata?.perfil;
      const destino = perfil === 'Operador' ? '/operador' : '/dashboard';
      window.location.href = destino;
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return <AuthLoadingScreen message="Verificando sessão..." />;
  }

  return (
    <AuthPageWrapper gridId="grid-setpw">
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/logo_verde.png"
            alt="GestSilo"
            width={220}
            height={55}
            className="object-contain brightness-130"
            priority
          />
        </div>

        {/* Card */}
        <AuthCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[8px] bg-green-dim border border-green-border flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-brand-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Criar sua senha</h1>
              <p className="text-sm text-muted-foreground">Defina uma senha para acessar o sistema</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <AuthLabel htmlFor="password">Nova senha</AuthLabel>
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
              <AuthLabel htmlFor="confirm">Confirmar senha</AuthLabel>
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
                'Entrar no GestSilo'
              )}
            </button>
          </form>
        </AuthCard>

        <footer className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </div>
    </AuthPageWrapper>
  );
}
