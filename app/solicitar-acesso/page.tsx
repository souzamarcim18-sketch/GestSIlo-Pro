'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AuthPageWrapper } from '@/components/auth/AuthPageWrapper';
import { AuthCard } from '@/components/auth/AuthCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { solicitarAcessoAction } from './actions';

const PLANOS = ['Free', 'Starter', 'Pro', 'Max'] as const;
type Plano = (typeof PLANOS)[number];

const PLANO_DESC: Record<Plano, string> = {
  Free: 'Grátis para sempre · Até 2 silos',
  Starter: 'R$ 49/mês · Silos, rebanho e balanço',
  Pro: 'R$ 74/mês · Gestão completa (mais popular)',
  Max: 'R$ 119/mês · Pro + assessoria da equipe',
};

function maskWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function SolicitarAcessoForm() {
  const searchParams = useSearchParams();
  const planoParam = searchParams.get('plano');
  const initialPlano: Plano =
    planoParam && PLANOS.includes(planoParam as Plano)
      ? (planoParam as Plano)
      : 'Free';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [fazenda, setFazenda] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [plano, setPlano] = useState<Plano>(initialPlano);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await solicitarAcessoAction({ nome, email, fazenda, whatsapp, plano });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setEnviado(true);
  };

  if (enviado) {
    return (
      <AuthCard className="text-center py-10">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-green-dim border border-green-border flex items-center justify-center">
            <CheckCircle2 size={32} className="text-brand-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground mb-3">
          Solicitação enviada!
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Entraremos em contato em até 24h pelo WhatsApp ou e-mail informado.
        </p>
        <Link
          href="/"
          className="inline-block mt-8 text-sm font-semibold text-brand-primary hover:opacity-80 transition-opacity"
        >
          ← Voltar ao início
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Solicitar acesso
        </h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Preencha os dados abaixo e entraremos em contato em até 24h.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Nome completo
          </Label>
          <Input
            id="nome"
            type="text"
            placeholder="João Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoComplete="name"
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
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Fazenda */}
        <div className="space-y-2">
          <Label htmlFor="fazenda" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Nome da fazenda
          </Label>
          <Input
            id="fazenda"
            type="text"
            placeholder="Fazenda Bela Vista"
            value={fazenda}
            onChange={(e) => setFazenda(e.target.value)}
            required
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            WhatsApp
          </Label>
          <Input
            id="whatsapp"
            type="tel"
            placeholder="(31) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
            required
            autoComplete="tel"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Plano */}
        <div className="space-y-2">
          <Label htmlFor="plano" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Plano de interesse
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {PLANOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlano(p)}
                className="text-left p-3 rounded-xl border transition-all duration-150"
                style={{
                  background: plano === p ? 'rgba(0,166,81,0.12)' : 'var(--input)',
                  borderColor: plano === p ? '#00A651' : 'var(--border)',
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{ color: plano === p ? '#00A651' : 'var(--foreground)' }}
                >
                  {p}
                </p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                  {PLANO_DESC[p]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
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
            minHeight: '48px',
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Enviando...</span>
            </>
          ) : (
            'Solicitar acesso'
          )}
        </button>

        <p className="text-center text-sm pt-2 text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-semibold text-brand-primary hover:opacity-80 transition-opacity">
            Entrar
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export default function SolicitarAcessoPage() {
  return (
    <AuthPageWrapper gridId="grid-solicitar" showBackButton={true}>
      <main id="main-content" className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo_verde.png"
            alt="GestSilo"
            width={220}
            height={55}
            className="object-contain brightness-130"
            priority
          />
        </div>

        <Suspense fallback={null}>
          <SolicitarAcessoForm />
        </Suspense>

        <footer className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </footer>
      </main>
    </AuthPageWrapper>
  );
}
