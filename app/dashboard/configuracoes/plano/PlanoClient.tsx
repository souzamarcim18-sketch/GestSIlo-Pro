'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Star,
  AlertTriangle,
  XCircle,
  Archive,
  ArrowUpCircle,
  RefreshCw,
  Database,
  ClipboardList,
} from 'lucide-react';

type StatusAssinatura = 'ativa' | 'inadimplente' | 'cancelada' | string;

type RecursoArquivado = {
  id: string;
  tipo_recurso: string;
  dados_snapshot: unknown;
  created_at: string;
};

interface PlanoClientProps {
  plano: string;
  status: StatusAssinatura;
  periodoFim: string | null;
  totalSilos: number;
  totalPlanejamentos: number;
  limites: { silos: number | null; planejamentos: number | null };
  arquivados: RecursoArquivado[];
  isAdmin: boolean;
  temStripeCustomer: boolean;
}

const NOMES_PLANO: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  ativa:       { label: 'Ativa',        variant: 'default'     },
  inadimplente:{ label: 'Inadimplente', variant: 'destructive' },
  cancelada:   { label: 'Cancelada',    variant: 'secondary'   },
};

const NOMES_RECURSO: Record<string, string> = {
  silo: 'Silo',
  planejamento_silagem: 'Planejamento de Silagem',
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function UsageBar({
  label,
  icon: Icon,
  atual,
  limite,
}: {
  label: string;
  icon: React.ElementType;
  atual: number;
  limite: number | null;
}) {
  const ilimitado = limite === null;
  const percent = ilimitado ? 0 : Math.min((atual / limite) * 100, 100);
  const quaseCheiando = !ilimitado && percent >= 80;
  const cheio = !ilimitado && atual >= limite;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground font-medium">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </span>
        <span className={cheio ? 'text-destructive font-semibold' : 'text-foreground font-semibold'}>
          {ilimitado ? `${atual} / ilimitado` : `${atual} / ${limite}`}
        </span>
      </div>
      {!ilimitado && (
        <Progress
          value={percent}
          className={`h-2 ${cheio ? '[&>div]:bg-destructive' : quaseCheiando ? '[&>div]:bg-yellow-500' : '[&>div]:bg-primary'}`}
        />
      )}
    </div>
  );
}

export function PlanoClient({
  plano,
  status,
  periodoFim,
  totalSilos,
  totalPlanejamentos,
  limites,
  arquivados,
  isAdmin,
  temStripeCustomer,
}: PlanoClientProps) {
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const router = useRouter();

  const nomePlano = NOMES_PLANO[plano] ?? plano;
  const statusConfig = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  const isFree = plano === 'free';
  const isPago = !isFree;
  const inadimplente = status === 'inadimplente';
  const cancelada = status === 'cancelada';

  async function abrirPortal() {
    setAbrindoPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Não foi possível abrir o portal de pagamento.');
        return;
      }
      router.push(data.url);
    } catch {
      toast.error('Erro ao conectar com o portal de pagamento.');
    } finally {
      setAbrindoPortal(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plano e Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu plano e dados de cobrança.
        </p>
      </div>

      {/* Banner inadimplente */}
      {inadimplente && isAdmin && (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/40 p-4"
          style={{ background: 'var(--red-dim)' }}
        >
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Pagamento pendente</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Houve uma falha no pagamento da sua assinatura. Regularize para manter o acesso.
            </p>
          </div>
          {temStripeCustomer && (
            <Button
              size="sm"
              variant="destructive"
              onClick={abrirPortal}
              disabled={abrindoPortal}
            >
              {abrindoPortal ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Regularizar'}
            </Button>
          )}
        </div>
      )}

      {/* Banner cancelada */}
      {cancelada && (
        <div
          className="flex items-start gap-3 rounded-lg border border-border p-4"
          style={{ background: 'var(--sidebar)' }}
        >
          <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Assinatura cancelada</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sua assinatura foi encerrada. Reative para recuperar todos os seus dados e funcionalidades.
            </p>
          </div>
          {isAdmin && (
            <Link href="/#planos" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Reativar
            </Link>
          )}
        </div>
      )}

      {/* Card — Plano atual */}
      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: 'var(--green-dim)' }}
          >
            <Star className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plano atual</p>
            <p className="text-xl font-bold text-foreground">{nomePlano}</p>
          </div>
          <div className="ml-auto">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </div>

        {periodoFim && (
          <p className="text-sm text-muted-foreground">
            Renova em <span className="text-foreground font-medium">{formatarData(periodoFim)}</span>
          </p>
        )}

        {isAdmin && (
          <div className="flex flex-wrap gap-2 pt-2">
            {isFree && (
              <Link href="/#planos" className={buttonVariants({ variant: 'default' })}>
                <ArrowUpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Fazer upgrade
              </Link>
            )}

            {isPago && status === 'ativa' && temStripeCustomer && (
              <Button
                variant="outline"
                onClick={abrirPortal}
                disabled={abrindoPortal}
              >
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                {abrindoPortal ? 'Abrindo portal…' : 'Gerenciar assinatura'}
              </Button>
            )}

            {isPago && inadimplente && temStripeCustomer && (
              <Button
                variant="destructive"
                onClick={abrirPortal}
                disabled={abrindoPortal}
              >
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                {abrindoPortal ? 'Abrindo portal…' : 'Regularizar pagamento'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Card — Uso */}
      <div
        className="rounded-xl border p-6 space-y-5"
        style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Uso do plano</p>

        <UsageBar
          label="Silos ativos"
          icon={Database}
          atual={totalSilos}
          limite={limites.silos}
        />
        <UsageBar
          label="Planejamentos de Silagem"
          icon={ClipboardList}
          atual={totalPlanejamentos}
          limite={limites.planejamentos}
        />

        {isFree && isAdmin && (
          <p className="text-xs text-muted-foreground pt-1">
            Quer remover os limites?{' '}
            <Link href="/#planos" className="text-primary underline underline-offset-2">
              Conheça os planos pagos
            </Link>
            .
          </p>
        )}
      </div>

      {/* Seção — Dados arquivados */}
      {arquivados.length > 0 && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-bold text-foreground">Dados arquivados</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Os itens abaixo foram arquivados automaticamente ao fazer downgrade. Reative seu plano para restaurá-los.
          </p>
          <ul className="divide-y divide-border">
            {arquivados.map((item) => {
              const snapshot = item.dados_snapshot as Record<string, unknown> | null;
              const nome = typeof snapshot?.nome === 'string' ? snapshot.nome : '—';
              return (
                <li key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {NOMES_RECURSO[item.tipo_recurso] ?? item.tipo_recurso} · arquivado em {formatarData(item.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {isAdmin && (
            <Link href="/#planos" className={buttonVariants({ variant: 'outline' }) + ' w-full'}>
              <ArrowUpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Reativar plano para restaurar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
