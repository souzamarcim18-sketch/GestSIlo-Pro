'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Check,
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

type PlanoUpgrade = 'starter' | 'pro' | 'max';
type Periodo = 'mensal' | 'anual';

const PLANOS_UPGRADE: Array<{
  slug: PlanoUpgrade;
  nome: string;
  mensal: string;
  anual: string;
  destaque: boolean;
  recursos: string[];
}> = [
  {
    slug: 'starter',
    nome: 'Starter',
    mensal: 'R$ 49/mês',
    anual: 'R$ 490/ano',
    destaque: false,
    recursos: ['Silos ilimitados', 'Rebanho completo', 'Balanço Forrageiro', 'Pastagens e Piquetes', 'Insumos com alertas'],
  },
  {
    slug: 'pro',
    nome: 'Pro',
    mensal: 'R$ 74/mês',
    anual: 'R$ 740/ano',
    destaque: true,
    recursos: ['Tudo do Starter', 'Talhões ilimitados', 'Frota e Maquinário', 'Financeiro completo', 'Todos os relatórios exportáveis'],
  },
  {
    slug: 'max',
    nome: 'Max',
    mensal: 'R$ 119/mês',
    anual: 'R$ 1.190/ano',
    destaque: false,
    recursos: ['Tudo do Pro', 'Reunião online a cada 2 meses', 'Suporte prioritário (4h úteis)', 'Acesso antecipado a novidades'],
  },
];

// Planos disponíveis para upgrade a partir do plano atual
const UPGRADES_DISPONIVEIS: Record<string, PlanoUpgrade[]> = {
  free:    ['starter', 'pro', 'max'],
  starter: ['pro', 'max'],
  pro:     ['max'],
  max:     [],
};

// Módulos incluídos por plano (exibidos no card "Incluído no seu plano")
const MODULOS_POR_PLANO: Record<string, string[]> = {
  free: [],
  starter: [
    'Silos ilimitados', 'Rebanho completo', 'Balanço Forrageiro',
    'Pastagens e Piquetes', 'Insumos com alertas', 'Calculadoras Agronômicas',
    'Relatórios de silos e rebanho',
  ],
  pro: [
    'Tudo do Starter', 'Talhões ilimitados', 'Frota e Maquinário',
    'Financeiro completo', 'Estoque de Produtos', 'Planejamento de Compras',
    'Calendário de Atividades', 'Todos os relatórios exportáveis (XLSX e PDF)',
  ],
  max: [
    'Tudo do Pro', 'Reunião online a cada 2 meses com equipe GestSilo',
    'Resposta em até 4h úteis', 'Acesso antecipado a novidades',
  ],
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
  const [abrindoCheckout, setAbrindoCheckout] = useState<PlanoUpgrade | null>(null);
  const [mostrarUpgrade, setMostrarUpgrade] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<Periodo>('mensal');

  const nomePlano = NOMES_PLANO[plano] ?? plano;
  const statusConfig = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  const isFree = plano === 'free';
  const isPago = !isFree;
  const inadimplente = status === 'inadimplente';
  const cancelada = status === 'cancelada';
  const upgradesDisponiveis = (UPGRADES_DISPONIVEIS[plano] ?? []).map(
    (slug) => PLANOS_UPGRADE.find((p) => p.slug === slug)!,
  );
  const podeUpgrade = upgradesDisponiveis.length > 0 && status !== 'cancelada';
  const modulosIncluidos = MODULOS_POR_PLANO[plano] ?? [];

  async function iniciarCheckout(planoEscolhido: PlanoUpgrade) {
    setAbrindoCheckout(planoEscolhido);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: planoEscolhido, periodo: periodoSelecionado }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Não foi possível iniciar o checkout.');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Erro ao conectar com o sistema de pagamento.');
    } finally {
      setAbrindoCheckout(null);
    }
  }

  async function abrirPortal() {
    setAbrindoPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Não foi possível abrir o portal de pagamento.');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarUpgrade(true)}
            >
              Reativar
            </Button>
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
            {podeUpgrade && (
              <Button variant="default" onClick={() => setMostrarUpgrade((v) => !v)}>
                <ArrowUpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                {mostrarUpgrade ? 'Ocultar planos' : 'Fazer upgrade'}
              </Button>
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

      {/* Card — Uso (Free) / Módulos incluídos (planos pagos) */}
      <div
        className="rounded-xl border p-6 space-y-5"
        style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}
      >
        {isFree ? (
          <>
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
            {isAdmin && (
              <p className="text-xs text-muted-foreground pt-1">
                Quer remover os limites?{' '}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                  onClick={() => setMostrarUpgrade(true)}
                >
                  Conheça os planos pagos
                </button>
                .
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Incluído no seu plano</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {modulosIncluidos.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>
            {podeUpgrade && isAdmin && (
              <p className="text-xs text-muted-foreground pt-1">
                Quer mais recursos?{' '}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                  onClick={() => setMostrarUpgrade(true)}
                >
                  Ver planos superiores
                </button>
                .
              </p>
            )}
          </>
        )}
      </div>

      {/* Painel de upgrade */}
      {mostrarUpgrade && isAdmin && (
        <div
          className="rounded-xl border p-6 space-y-5"
          style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Escolha seu plano
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setMostrarUpgrade(false)}
            >
              Fechar
            </button>
          </div>

          {/* Toggle mensal / anual */}
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setPeriodoSelecionado('mensal')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${periodoSelecionado === 'mensal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setPeriodoSelecionado('anual')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${periodoSelecionado === 'anual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Anual
              <span className="ml-1.5 text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                2 meses grátis
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {upgradesDisponiveis.map((p) => (
              <div
                key={p.slug}
                className={`rounded-lg border p-4 space-y-3 flex flex-col ${p.destaque ? 'border-primary' : 'border-border'}`}
                style={{ background: p.destaque ? 'var(--green-dim)' : 'var(--background)' }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{p.nome}</p>
                    {p.destaque && (
                      <span className="text-xs font-semibold text-primary">Mais popular</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {periodoSelecionado === 'mensal' ? p.mensal : p.anual}
                  </p>
                </div>
                <ul className="space-y-1 flex-1">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {r}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.destaque ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  disabled={abrindoCheckout === p.slug}
                  onClick={() => iniciarCheckout(p.slug)}
                >
                  {abrindoCheckout === p.slug ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    `Assinar ${p.nome}`
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <Button variant="outline" className="w-full" onClick={() => setMostrarUpgrade(true)}>
              <ArrowUpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Reativar plano para restaurar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
