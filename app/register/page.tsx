'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

// Fundo metálico padrão da aplicação
const BG_METAL =
  'linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 25%, #f5f5f5 50%, #d0d0d0 75%, #a8a8a8 100%)';

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
      authLog('handleRegister: starting signUp for email:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
            perfil,
          },
        },
      });

      if (error) {
        authError('handleRegister: signUp error:', error.message);
        throw error;
      }

      if (data.user) {
        authLog('handleRegister: signUp success, creating profile row');

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              nome,
              email,
              perfil,
            },
          ]);

        if (profileError) {
          authError('handleRegister: profile insert error:', profileError.message);
          throw new Error('Erro ao finalizar cadastro. Contate o suporte.');
        }

        authLog('handleRegister: profile created successfully');
      }

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
    <div
      className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden"
      style={{ background: BG_METAL }}
    >
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
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00A651" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-register)" />
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
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-8">

          <div className="mb-6">
            <h1 className="text-2xl font-bold" style={{ color: '#023c1f' }}>
              Criar Conta
            </h1>
            <p className="text-sm mt-1" style={{ color: '#4a4a4a' }}>
              Cadastre-se para começar a gerenciar sua fazenda.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" style={{ color: '#1a1a1a' }} className="font-semibold">
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
                className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: '#1a1a1a' }} className="font-semibold">
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
                className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: '#1a1a1a' }} className="font-semibold">
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
                className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Perfil */}
            <div className="space-y-2">
              <Label htmlFor="perfil" style={{ color: '#1a1a1a' }} className="font-semibold">
                Perfil de Acesso
              </Label>
              <Select
                value={perfil}
                onValueChange={(v) => setPerfil(v as Perfil)}
              >
                <SelectTrigger
                  id="perfil"
                  aria-label="Selecione o perfil de acesso"
                  className="bg-white border-gray-300 text-gray-900"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Operador">Operador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs" style={{ color: '#4a4a4a' }}>
                <strong>Administrador:</strong> acesso completo ao dashboard.{' '}
                <strong>Operador:</strong> acesso restrito à tela de operações.
              </p>
            </div>

            {/* Botão submit */}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-6"
              style={{
                background: loading
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,166,81,0.35)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
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
                  <span>Cadastrando...</span>
                </>
              ) : (
                'Cadastrar'
              )}
            </button>

            {/* Link para login */}
            <p className="text-center text-sm pt-2" style={{ color: '#4a4a4a' }}>
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#00843D' }}
              >
                Entre aqui
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs" style={{ color: '#4a4a4a' }}>
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </main>
    </div>
  );
}
