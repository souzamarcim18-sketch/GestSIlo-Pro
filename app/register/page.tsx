'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthPageWrapper } from '@/components/auth/AuthPageWrapper';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authLog, authError } from '@/lib/auth/logger';
import { toast } from 'sonner';
import Image from 'next/image';

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      authLog('handleRegister: starting POST /api/auth/register for email:', email);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nome, perfil: 'Administrador' }),
      });

      const data = await response.json();

      if (!response.ok) {
        authError('handleRegister: API error:', data.error);
        throw new Error(data.error || 'Erro ao realizar cadastro');
      }

      authLog('handleRegister: signUp success — profile criado pela trigger handle_new_user');
      toast.success('Cadastro realizado! Verifique seu e-mail.');
      router.push('/login');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao realizar cadastro';
      authError('handleRegister: caught error:', message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageWrapper gridId="grid-register" showBackButton={true}>
      {/* Conteúdo principal */}
      <main
        id="main-content"
        className="w-full max-w-md relative z-10"
      >
        {/* Logo horizontal (padrão do footer/navbar) */}
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

        {/* Card principal */}
        <AuthCard>

          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Criar Conta
            </h1>
            <p className="text-sm mt-1 text-muted-foreground">
              Cadastre-se para começar a gerenciar sua fazenda.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Nome Completo
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                aria-required="true"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-required="true"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                aria-required="true"
                minLength={8}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Botão submit */}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-6 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: loading
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,166,81,0.35)',
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
                  <span>Cadastrando...</span>
                </>
              ) : (
                'Cadastrar'
              )}
            </button>

            {/* Link para login */}
            <p className="text-center text-sm pt-2 text-muted-foreground">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-semibold text-brand-primary hover:opacity-80 transition-opacity"
              >
                Entre aqui
              </Link>
            </p>
          </form>
        </AuthCard>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </main>
    </AuthPageWrapper>
  );
}
