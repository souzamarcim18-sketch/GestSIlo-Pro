'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authLog, authError } from '@/lib/auth/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Image from 'next/image';

type Perfil = 'Administrador' | 'Operador';

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('Administrador');
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
        body: JSON.stringify({ email, password, nome, perfil }),
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
    <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden bg-metal">
      {/* Grid pattern verde decorativo */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        aria-hidden="true"
      >
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern id="grid-register" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--brand-green-vivid)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-register)" />
        </svg>
      </div>

      {/* Botão Voltar */}
      <button
        onClick={() => router.push('/')}
        aria-label="Voltar para a página inicial"
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-card hover:text-brand-primary transition-all shadow-md cursor-pointer"
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span>Voltar ao Início</span>
      </button>

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
        <div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-deep">
              Criar Conta
            </h1>
            <p className="text-sm mt-1 text-muted-foreground">
              Cadastre-se para começar a gerenciar sua fazenda.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-semibold text-foreground">
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
              <Label htmlFor="email" className="font-semibold text-foreground">
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
              <Label htmlFor="password" className="font-semibold text-foreground">
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

            {/* Perfil */}
            <div className="space-y-2">
              <Label htmlFor="perfil" className="font-semibold text-foreground">
                Perfil de Acesso
              </Label>
              <Select
                value={perfil}
                onValueChange={(v) => setPerfil(v as Perfil)}
              >
                <SelectTrigger
                  id="perfil"
                  aria-label="Selecione o perfil de acesso"
                  className="bg-input border-border text-foreground"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Operador">Operador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Administrador:</strong> acesso completo ao dashboard.{' '}
                <strong>Operador:</strong> acesso restrito à tela de operações.
              </p>
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
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </main>
    </div>
  );
}
