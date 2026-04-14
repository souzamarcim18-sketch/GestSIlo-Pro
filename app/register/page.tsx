'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      className="flex items-center justify-center min-h-screen p-4 relative bg-primary/10 dark:bg-background"
    >
      {/* Padrão geométrico decorativo */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
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
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl text-sm font-medium text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted hover:text-primary transition-all shadow-sm cursor-pointer"
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span>Voltar ao Início</span>
      </button>

      {/* Conteúdo principal */}
      <main
        id="main-content"
        className="w-full max-w-md relative z-10"
      >
        {/* Logo — apenas decorativo, <h1> real está no Card */}
        <div className="flex justify-center mb-8" aria-hidden="true">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png?v=2"
              alt=""
              width={64}
              height={64}
              className="rounded-2xl shadow-xl object-contain"
              unoptimized
            />
            <div>
              <p className="font-black text-3xl tracking-tight">
                <span className="text-primary">Gest</span>
                <span className="text-primary">Silo</span>
              </p>
            </div>
          </div>
        </div>

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            {/* h1 único da página — CardTitle renderiza como h3 por padrão no shadcn */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Criar Conta</h1>
            <p className="text-sm text-gray-600 dark:text-muted-foreground mt-1">
              Cadastre-se para começar a gerenciar sua fazenda.
            </p>
          </CardHeader>

          <form onSubmit={handleRegister} noValidate>
            <CardContent className="space-y-4">

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="João Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  autoComplete="name"
                  aria-required="true"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
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
                />
              </div>

              {/* Perfil */}
              <div className="space-y-2">
                <Label htmlFor="perfil">Perfil de Acesso</Label>
                <Select
                  value={perfil}
                  onValueChange={(v) => setPerfil(v as Perfil)}
                >
                  <SelectTrigger id="perfil" aria-label="Selecione o perfil de acesso">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Operador">Operador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Administrador: acesso completo ao dashboard.
                  Operador: acesso restrito à tela de operações.
                </p>
              </div>

            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-muted-foreground">
                Já tem uma conta?{' '}
                <Link
                  href="/login"
                  className="text-primary dark:text-primary hover:underline font-medium"
                >
                  Entre aqui
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
