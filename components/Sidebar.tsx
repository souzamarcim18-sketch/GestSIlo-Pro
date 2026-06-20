'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Sprout,
  Leaf,
  Package,
  PackageOpen,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Calculator,
  Calendar,
  HelpCircle,
  GraduationCap,
  Scale,
  NotebookPen,
  ShoppingCart,
  RefreshCw,
  Tractor,
  CreditCard,
  Lock,
  Zap,
  ArrowRight,
  BookOpen,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CowIcon } from '@/components/icons/CowIcon';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { parsePlanoSlug, planoPermiteModulo, planoMinimoParaModulo, PLANOS, PlanoSlug } from '@/lib/planos';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSidebarOptional } from '@/components/SidebarContext';


type RouteItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: 'comingSoon' | null;
  modulo?: string;
};

type RouteGroup = {
  /** Subtítulo do grupo dentro do bloco Gerencial. */
  titulo: string;
  /** Chave estável usada para persistir o estado de expansão. */
  key: GroupKeyGerencial;
  routes: RouteItem[];
};

type GroupKeyGerencial = 'producao' | 'suprimentos' | 'gestao';

const gerencialGroups: RouteGroup[] = [
  {
    titulo: 'Produção',
    key: 'producao',
    routes: [
      { label: 'Silos',              icon: Database,    href: '/dashboard/silos',              badge: null },
      { label: 'Pastagens',          icon: Leaf,        href: '/dashboard/pastagens',          badge: null, modulo: 'pastagens' },
      { label: 'Balanço Forrageiro', icon: Scale,       href: '/dashboard/balanco-forrageiro', badge: null, modulo: 'balanco_forrageiro' },
      { label: 'Lavouras',           icon: Sprout,      href: '/dashboard/talhoes',            badge: null, modulo: 'talhoes' },
      { label: 'Rebanho',            icon: CowIcon,     href: '/dashboard/rebanho',            badge: null, modulo: 'rebanho' },
    ],
  },
  {
    titulo: 'Suprimentos',
    key: 'suprimentos',
    routes: [
      { label: 'Insumos',            icon: Package,     href: '/dashboard/insumos',            badge: null, modulo: 'insumos' },
      { label: 'Produtos',           icon: PackageOpen, href: '/dashboard/produtos',           badge: null, modulo: 'produtos' },
      { label: 'Frota',              icon: Tractor,     href: '/dashboard/frota',              badge: null, modulo: 'frota' },
      { label: 'Equipe',             icon: Users,       href: '/dashboard/mao-de-obra',        badge: null, modulo: 'mao_de_obra' },
    ],
  },
  {
    titulo: 'Gestão',
    key: 'gestao',
    routes: [
      { label: 'Financeiro',         icon: DollarSign,  href: '/dashboard/financeiro',         badge: null, modulo: 'financeiro' },
      { label: 'Calendário',         icon: Calendar,    href: '/dashboard/calendario',         badge: null },
      { label: 'Relatórios',         icon: BarChart3,   href: '/dashboard/relatorios',         badge: null },
    ],
  },
];

/** Rotas que o Operador não pode ver no bloco Gerencial. */
const OPERADOR_HIDDEN_HREFS = new Set([
  '/dashboard/mao-de-obra',
  '/dashboard/balanco-forrageiro',
  '/dashboard/relatorios',
]);

const ferramentasRoutes: RouteItem[] = [
  { label: 'Calculadoras',            icon: Calculator,    href: '/dashboard/calculadoras',          modulo: 'calculadoras' },
  { label: 'Planejamento de Silagem', icon: NotebookPen,   href: '/dashboard/planejamento-silagem'  },
  { label: 'Planejamento de Compras', icon: ShoppingCart,  href: '/dashboard/planejamento-compras', modulo: 'planejamento_compras' },
  { label: 'Assessoria agronômica',   icon: GraduationCap, href: '/dashboard/assessoria', modulo: 'assessoria' },
];

const sistemaRoutes: RouteItem[] = [
  { label: 'Configurações',      icon: Settings,    href: '/dashboard/configuracoes',       badge: null },
  { label: 'Plano e assinatura', icon: CreditCard,  href: '/dashboard/configuracoes/plano', badge: null },
  { label: 'Suporte',            icon: HelpCircle,  href: '/dashboard/suporte',             badge: null },
];

const sincronizacaoRoute: RouteItem = {
  label: 'Sincronização',
  icon: RefreshCw,
  href: '/dashboard/configuracoes/sincronizacao',
  badge: null,
};

/**
 * Chaves estáveis dos grupos recolhíveis. Servem de id no localStorage e de
 * `aria-controls`/`id` para acessibilidade. Não dependem do label traduzido.
 */
const GROUP_KEYS = ['producao', 'suprimentos', 'gestao', 'ferramentas', 'sistema'] as const;
type GroupKey = (typeof GROUP_KEYS)[number];

const COLLAPSE_STORAGE_KEY = 'gestsilo:sidebar:groups';

/** Apenas Produção começa aberto na primeira visita; o resto recolhido. */
const DEFAULT_OPEN: Record<GroupKey, boolean> = {
  producao: true,
  suprimentos: false,
  gestao: false,
  ferramentas: false,
  sistema: false,
};

function readGroupPreference(): Record<GroupKey, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_OPEN };
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<Record<GroupKey, boolean>>;
    const merged = { ...DEFAULT_OPEN };
    for (const key of GROUP_KEYS) {
      if (typeof parsed[key] === 'boolean') merged[key] = parsed[key] as boolean;
    }
    return merged;
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

/**
 * Estado de expansão dos grupos: cada grupo abre/fecha independentemente,
 * persistido em localStorage. Retorna o mapa e um toggle por chave.
 */
function useCollapsibleGroups() {
  const [open, setOpen] = useState<Record<GroupKey, boolean>>(readGroupPreference);

  const toggle = useCallback((key: GroupKey) => {
    setOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignora falha de persistência (modo privado)
      }
      return next;
    });
  }, []);

  /** Garante que um grupo esteja aberto (usado para revelar a rota ativa). */
  const ensureOpen = useCallback((key: GroupKey) => {
    setOpen((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignora falha de persistência
      }
      return next;
    });
  }, []);

  return { open, toggle, ensureOpen };
}

function GroupHeader({
  title,
  groupKey,
  isOpen,
  onToggle,
}: {
  title: string;
  groupKey: GroupKey;
  isOpen: boolean;
  onToggle: (key: GroupKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(groupKey)}
      aria-expanded={isOpen}
      aria-controls={`sidebar-group-${groupKey}`}
      className="group/gh w-full flex items-center justify-between px-3 py-1 text-text-faint uppercase text-xs font-bold tracking-[0.15em] rounded-md hover:text-muted-foreground hover:bg-white/[0.03] transition-colors group-data-[collapsed=true]/sb:hidden"
    >
      <span>{title}</span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200',
          isOpen ? 'rotate-0' : '-rotate-90',
        )}
      />
    </button>
  );
}

// const rebanhoSubRoutes: RouteItem[] = [
//   { label: 'Indicadores',    icon: BarChart3,          href: '/dashboard/rebanho/indicadores'             },
//   { label: 'Reprodução',     icon: Heart,               href: '/dashboard/rebanho/reproducao/eventos'      },
//   { label: 'Reprodutores',   icon: Dna,                 href: '/dashboard/rebanho/reproducao/reprodutores' },
//   { label: 'Parâmetros',     icon: SlidersHorizontal,   href: '/dashboard/rebanho/reproducao/parametros'   },
//   { label: 'Leiteira',       icon: Milk,                href: '/dashboard/rebanho/leiteira'                },
//   { label: 'Corte',          icon: Beef,               href: '/dashboard/rebanho/corte'                   },
//   { label: 'Sanidade',       icon: Stethoscope,         href: '/dashboard/rebanho/sanidade'                },
//   { label: 'Movimentações',  icon: ArrowRightLeft,      href: '/dashboard/rebanho/movimentacoes'           },
// ];

interface SidebarProps {
  onNavigate?: () => void;
  /** Quando true, a sidebar inicia recolhida (só ícones) e expande no hover. Usada no desktop. */
  collapsible?: boolean;
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onNavigate,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
  badge?: 'comingSoon' | null;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        prefetch={false}
        aria-current={isActive ? 'page' : undefined}
        title={label}
        className={cn(
          'text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 px-3 mr-2',
          'group-data-[collapsed=true]/sb:justify-center group-data-[collapsed=true]/sb:px-0 group-data-[collapsed=true]/sb:mr-0',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-150',
        )}
        style={isActive ? {
          background: 'var(--green-dim)',
          border: '1px solid var(--green-border)',
          borderRadius: 8,
          boxShadow: '0 0 12px var(--green-glow)',
        } : undefined}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-4 w-4 flex-shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <span className="truncate group-data-[collapsed=true]/sb:hidden">{label}</span>
        </span>
        {badge === 'comingSoon' && (
          <Badge
            variant="outline"
            className="ml-1 bg-[color:var(--gold-dim)] text-status-warning border-[color:var(--gold-border)] text-[9px] font-bold tracking-wider rounded-full px-1.5 py-0 group-data-[collapsed=true]/sb:hidden"
          >
            Em&nbsp;breve
          </Badge>
        )}
      </Link>
    </li>
  );
}

function SubNavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onNavigate,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
  badge?: 'comingSoon' | null;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        prefetch={false}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 pl-8 pr-3 mr-2',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-150',
        )}
        style={isActive ? {
          background: 'var(--green-dim)',
          border: '1px solid var(--green-border)',
          borderRadius: 8,
          boxShadow: '0 0 12px var(--green-glow)',
        } : undefined}
      >
        <span className="flex items-center gap-2">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-3 w-3 flex-shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <span>{label}</span>
        </span>
        {badge === 'comingSoon' && (
          <Badge
            variant="outline"
            className="ml-1 bg-[color:var(--gold-dim)] text-status-warning border-[color:var(--gold-border)] text-[9px] font-bold tracking-wider rounded-full px-1.5 py-0"
          >
            Em breve
          </Badge>
        )}
      </Link>
    </li>
  );
}


const PLANO_LABELS: Record<PlanoSlug, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
};

const PLANO_ORDER: PlanoSlug[] = ['free', 'starter', 'pro', 'max'];

const PLANO_PRECO: Record<PlanoSlug, string> = {
  free: 'Grátis',
  starter: 'R$ 49/mês',
  pro: 'R$ 74/mês',
  max: 'R$ 119/mês',
};

function UpgradeModal({
  open,
  onClose,
  moduloLabel,
  moduloSlug,
  planoAtual,
}: {
  open: boolean;
  onClose: () => void;
  moduloLabel: string;
  moduloSlug: string;
  planoAtual: PlanoSlug;
}) {
  const router = useRouter();
  const planoMinimo = planoMinimoParaModulo(moduloSlug);
  const planosQuePermitem = PLANO_ORDER.filter((p) => planoPermiteModulo(p, moduloSlug));
  const planosDisponiveis = planosQuePermitem.filter((p) => PLANO_ORDER.indexOf(p) > PLANO_ORDER.indexOf(planoAtual));

  const handleUpgrade = (plano: PlanoSlug) => {
    onClose();
    router.push(`/dashboard/configuracoes/plano?upgrade=${plano}&origem=modal_upgrade`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0" style={{ background: 'var(--sidebar)', border: '1px solid var(--border)' }}>

        {/* Cabeçalho com gradiente */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{ background: 'linear-gradient(135deg, var(--green-dim) 0%, transparent 100%)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)' }}>
              <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Módulo bloqueado</p>
              <DialogTitle className="text-sm font-bold text-foreground leading-tight">{moduloLabel}</DialogTitle>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este módulo está disponível a partir do plano{' '}
            <span className="text-primary font-semibold">{planoMinimo ? PLANO_LABELS[planoMinimo] : 'Pro'}</span>.
            Faça upgrade para desbloquear.
          </p>
        </div>

        {/* Planos disponíveis */}
        <div className="px-6 py-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Planos que incluem este módulo</p>
          {planosDisponiveis.map((plano) => {
            const isPro = plano === 'pro';
            return (
              <button
                key={plano}
                onClick={() => handleUpgrade(plano)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-150 text-left group',
                  isPro
                    ? 'text-foreground hover:opacity-90'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                )}
                style={isPro ? {
                  background: 'linear-gradient(135deg, var(--green-dim) 0%, var(--sidebar) 100%)',
                  border: '1px solid var(--green-border)',
                  boxShadow: '0 0 12px var(--green-glow)',
                } : {
                  border: '1px solid var(--border)',
                }}
              >
                <span className="flex items-center gap-2">
                  {isPro && <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden="true" />}
                  <span className="text-xs font-bold">{PLANO_LABELS[plano]}</span>
                  {isPro && (
                    <Badge className="text-[9px] px-1.5 py-0 font-bold" style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)', color: 'var(--primary)' }}>
                      Popular
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-primary">{PLANO_PRECO[plano]}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground text-center transition-colors py-1"
          >
            Continuar com o plano atual
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function LockedNavItem({
  icon: Icon,
  label,
  modulo,
  onOpenUpgrade,
}: {
  icon: React.ElementType;
  label: string;
  modulo: string;
  onOpenUpgrade: (label: string, modulo: string) => void;
}) {
  return (
    <li>
      <button
        onClick={() => onOpenUpgrade(label, modulo)}
        title={label}
        className="text-xs w-full group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 px-3 mr-2 text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.04] transition-all duration-150 group-data-[collapsed=true]/sb:justify-center group-data-[collapsed=true]/sb:px-0 group-data-[collapsed=true]/sb:mr-0"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
          <span className="truncate group-data-[collapsed=true]/sb:hidden">{label}</span>
        </span>
        <Lock aria-hidden="true" className="h-3 w-3 flex-shrink-0 text-muted-foreground/40 group-data-[collapsed=true]/sb:hidden" />
      </button>
    </li>
  );
}

export function Sidebar({ onNavigate, collapsible = false }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, planoAtual } = useAuth();
  const [upgradeModal, setUpgradeModal] = useState<{ label: string; modulo: string } | null>(null);

  // Estado de expansão vem do contexto (compartilhado com o <main> para o push).
  // Fora do provider (Sheet mobile), o contexto é null → sidebar sempre expandida.
  const sidebarCtx = useSidebarOptional();
  const expanded = collapsible ? (sidebarCtx?.expanded ?? false) : true;
  const isCollapsed = collapsible && !expanded;

  const { open: groupsOpen, toggle: toggleGroup, ensureOpen: ensureGroupOpen } = useCollapsibleGroups();

  const plano = parsePlanoSlug(planoAtual);

  const handleOpenUpgrade = (label: string, modulo: string) => {
    setUpgradeModal({ label, modulo });
  };

  // Aplica a visibilidade do Operador por grupo, descartando grupos vazios.
  const visibleGerencialGroups = gerencialGroups
    .map((group) => ({
      ...group,
      routes:
        profile?.perfil === 'Operador'
          ? group.routes.filter((r) => !OPERADOR_HIDDEN_HREFS.has(r.href))
          : group.routes,
    }))
    .filter((group) => group.routes.length > 0);

  // Descobre a qual grupo a rota ativa pertence, para revelá-lo automaticamente.
  const activeGroupKey = useMemo<GroupKey | null>(() => {
    for (const group of gerencialGroups) {
      if (group.routes.some((r) => pathname.startsWith(r.href))) return group.key;
    }
    if (ferramentasRoutes.some((r) => pathname.startsWith(r.href))) return 'ferramentas';
    if (
      sistemaRoutes.some((r) => pathname === r.href) ||
      pathname === sincronizacaoRoute.href
    ) {
      return 'sistema';
    }
    return null;
  }, [pathname]);

  // Abre o grupo da rota ativa quando ela muda (sem fechar os demais).
  useEffect(() => {
    if (activeGroupKey) ensureGroupOpen(activeGroupKey);
  }, [activeGroupKey, ensureGroupOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      data-collapsed={isCollapsed ? 'true' : undefined}
      onMouseEnter={collapsible ? () => sidebarCtx?.setHovered(true) : undefined}
      onMouseLeave={collapsible ? () => sidebarCtx?.setHovered(false) : undefined}
      className={cn(
        'group/sb flex flex-col h-full relative transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-[68px]' : 'w-64',
      )}
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Glow topo */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(180deg, var(--green-dim) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="py-6 flex-1 flex flex-col min-h-0 px-3 group-data-[collapsed=true]/sb:px-2 relative z-10 transition-[padding] duration-200">

        {/* Logo + botão de fixar — completa quando expandida, só o símbolo quando recolhida */}
        <div className="flex items-center mb-6 h-[43px]">
          <Link
            href="/dashboard"
            className="flex items-center justify-center flex-1 min-w-0 group transition-all"
            aria-label="GestSilo — ir para o Dashboard"
          >
            {isCollapsed ? (
              <Image
                src="/logo_verde_symbol.png"
                alt="GestSilo"
                width={36}
                height={36}
                className="object-contain group-hover:opacity-90 transition-opacity"
                priority
                aria-hidden="true"
              />
            ) : (
              <Image
                src="/logo_verde.png"
                alt="GestSilo"
                width={170}
                height={43}
                className="object-contain group-hover:opacity-90 transition-opacity"
                priority
                aria-hidden="true"
              />
            )}
          </Link>

          {/* Pin: só no desktop colapsável e quando expandida (hover ou já fixada) */}
          {collapsible && sidebarCtx && expanded && (
            <button
              type="button"
              onClick={sidebarCtx.togglePinned}
              title={sidebarCtx.pinned ? 'Liberar menu (recolher no hover)' : 'Fixar menu aberto'}
              aria-label={sidebarCtx.pinned ? 'Liberar menu' : 'Fixar menu aberto'}
              aria-pressed={sidebarCtx.pinned}
              className={cn(
                'ml-1 flex-shrink-0 rounded-md p-1.5 transition-colors',
                sidebarCtx.pinned
                  ? 'text-primary hover:bg-white/[0.06]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]',
              )}
            >
              {sidebarCtx.pinned ? (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Navegação */}
        <ScrollArea className="-mx-2 px-2 flex-1 min-h-0 h-full">

          {/* Bloco 1 — Dashboard */}
          <nav role="navigation" aria-label="Menu principal">
            <ul className="space-y-0.5 list-none pb-2">
              <NavItem
                href="/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                isActive={pathname === '/dashboard'}
                onNavigate={onNavigate}
              />
            </ul>
          </nav>

          {/* Separador */}
          <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

          {/* Bloco 2 — Gerencial (sub-agrupado em Produção / Suprimentos / Gestão) */}
          <nav role="navigation" aria-label="Gerencial">
            {visibleGerencialGroups.map((group, groupIndex) => {
              // Recolhida (só ícones): sempre mostra os itens — não há subtítulo/toggle.
              const itemsVisible = isCollapsed || groupsOpen[group.key];
              return (
              <div key={group.titulo} className={cn('pb-2', groupIndex > 0 && 'pt-1')}>
                <GroupHeader
                  title={group.titulo}
                  groupKey={group.key}
                  isOpen={groupsOpen[group.key]}
                  onToggle={toggleGroup}
                />
                {/* Quando recolhida, um divisor fino substitui o subtítulo entre grupos */}
                {groupIndex > 0 && (
                  <div
                    className="hidden group-data-[collapsed=true]/sb:block mx-auto my-1 w-4"
                    style={{ borderTop: '1px solid var(--border)' }}
                  />
                )}
                <ul
                  id={`sidebar-group-${group.key}`}
                  className={cn('space-y-0.5 list-none', !itemsVisible && 'hidden')}
                >
                  {group.routes.map((route) => {
                    const isLocked =
                      profile?.perfil !== 'Operador' &&
                      !!route.modulo &&
                      !planoPermiteModulo(plano, route.modulo);
                    return (
                      <div key={route.href}>
                        {isLocked ? (
                          <LockedNavItem
                            icon={route.icon}
                            label={route.label}
                            modulo={route.modulo!}
                            onOpenUpgrade={handleOpenUpgrade}
                          />
                        ) : (
                          <NavItem
                            href={route.href}
                            icon={route.icon}
                            label={route.label}
                            isActive={pathname.startsWith(route.href)}
                            onNavigate={onNavigate}
                            badge={route.badge}
                          />
                        )}
                      </div>
                    );
                  })}
                </ul>
              </div>
              );
            })}
          </nav>

          {/* Separador */}
          <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

          {/* Bloco 3 — Ferramentas */}
          <nav role="navigation" aria-label="Ferramentas">
            <div className="pb-2">
              <GroupHeader
                title="Ferramentas"
                groupKey="ferramentas"
                isOpen={groupsOpen.ferramentas}
                onToggle={toggleGroup}
              />
              <ul
                id="sidebar-group-ferramentas"
                className={cn('space-y-0.5 list-none', !(isCollapsed || groupsOpen.ferramentas) && 'hidden')}
              >
                {ferramentasRoutes.map((route) => {
                  const isAssessoria = route.href === '/dashboard/assessoria';
                  // Assessoria só aparece para Admin (independente do plano)
                  if (isAssessoria && profile?.perfil !== 'Administrador') return null;

                  const isPlanejamentoCompras = route.href === '/dashboard/planejamento-compras';
                  if (isPlanejamentoCompras && (profile?.perfil === 'Operador' || profile?.perfil === 'Visualizador')) return null;

                  const isLocked =
                    !!route.modulo &&
                    !planoPermiteModulo(plano, route.modulo);

                  if (isLocked) {
                    return (
                      <LockedNavItem
                        key={route.href}
                        icon={route.icon}
                        label={route.label}
                        modulo={route.modulo!}
                        onOpenUpgrade={handleOpenUpgrade}
                      />
                    );
                  }

                  return (
                    <NavItem
                      key={route.href}
                      href={route.href}
                      icon={route.icon}
                      label={route.label}
                      isActive={pathname.startsWith(route.href)}
                      onNavigate={onNavigate}
                    />
                  );
                })}

                {/* Materiais — biblioteca pública de guias, abre em nova aba */}
                <li>
                  <a
                    href="/guias"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavigate}
                    title="Materiais"
                    className="text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 px-3 mr-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group-data-[collapsed=true]/sb:justify-center group-data-[collapsed=true]/sb:px-0 group-data-[collapsed=true]/sb:mr-0"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate group-data-[collapsed=true]/sb:hidden">Materiais</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity group-data-[collapsed=true]/sb:hidden" aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          {/* Separador */}
          <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

          {/* Bloco 4 — Sistema */}
          <nav role="navigation" aria-label="Sistema">
            <div className="pb-2">
              <GroupHeader
                title="Sistema"
                groupKey="sistema"
                isOpen={groupsOpen.sistema}
                onToggle={toggleGroup}
              />
              <ul
                id="sidebar-group-sistema"
                className={cn('space-y-0.5 list-none', !(isCollapsed || groupsOpen.sistema) && 'hidden')}
              >
                {sistemaRoutes.map((route) => (
                  <NavItem
                    key={route.href}
                    href={route.href}
                    icon={route.icon}
                    label={route.label}
                    isActive={pathname === route.href}
                    onNavigate={onNavigate}
                    badge={route.badge}
                  />
                ))}
                {profile?.perfil !== 'Operador' && (
                  <NavItem
                    href={sincronizacaoRoute.href}
                    icon={sincronizacaoRoute.icon}
                    label={sincronizacaoRoute.label}
                    isActive={pathname === sincronizacaoRoute.href}
                    onNavigate={onNavigate}
                  />
                )}
              </ul>
            </div>
          </nav>

        </ScrollArea>
      </div>

      {/* Rodapé — Sair */}
      <div className="p-4 group-data-[collapsed=true]/sb:px-2" style={{ borderTop: '1px solid var(--border)' }}>
        <Button
          variant="ghost"
          title="Sair da conta"
          className="text-muted-foreground hover:text-destructive hover:bg-[color:var(--red-dim)] rounded-lg transition-all w-full justify-start py-1.5 px-3 h-auto text-xs font-semibold group-data-[collapsed=true]/sb:justify-center group-data-[collapsed=true]/sb:px-0"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4 mr-2.5 flex-shrink-0 group-data-[collapsed=true]/sb:mr-0" aria-hidden="true" />
          <span className="group-data-[collapsed=true]/sb:hidden">Sair da conta</span>
        </Button>
      </div>

      {upgradeModal && (
        <UpgradeModal
          open={!!upgradeModal}
          onClose={() => setUpgradeModal(null)}
          moduloLabel={upgradeModal.label}
          moduloSlug={upgradeModal.modulo}
          planoAtual={plano}
        />
      )}
    </div>
  );
}
