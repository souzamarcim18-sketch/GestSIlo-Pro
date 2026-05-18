'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { AuthPageWrapper } from '@/components/auth/AuthPageWrapper';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLabel } from '@/components/auth/AuthLabel';

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
    return <AuthLoadingScreen message="Validando link..." />;
  }

  return (
    <AuthPageWrapper gridId="grid-reset">
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
        <AuthCard>
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-sm font-medium mb-6 text-muted-foreground hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao login
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">
              Redefinir senha
            </h1>
            <p className="text-sm text-muted-foreground">
              Escolha uma nova senha segura para sua conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <AuthLabel htmlFor="password">Nova senha</AuthLabel>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-base shadow-sm transition-all"
              />
            </div>

            <div>
              <AuthLabel htmlFor="confirmPassword">Confirmar nova senha</AuthLabel>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-base shadow-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-2 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: loading
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,166,81,0.35)',
              }}
            >
              {loading ? 'Salvando...' : 'Redefinir senha'}
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
