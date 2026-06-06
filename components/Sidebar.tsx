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
  Truck,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Calculator,
  Beaker,
  Calendar,
  HelpCircle,
  GraduationCap,
  Heart,
  Milk,
  Scale,
  Stethoscope,
  ArrowRightLeft,
  NotebookPen,
  Beef,
  ShoppingCart,
  RefreshCw,
  Tractor,
  CreditCard,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CowIcon } from '@/components/icons/CowIcon';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { parsePlanoSlug, planoPermiteModulo } from '@/lib/planos';


type RouteItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: 'comingSoon' | null;
  modulo?: string;
};

const gerencialRoutes: RouteItem[] = [
  { label: 'Silos',              icon: Database,    href: '/dashboard/silos',              badge: null },
  { label: 'Pastagens',          icon: Leaf,        href: '/dashboard/pastagens',          badge: null, modulo: 'pastagens' },
  { label: 'Balanço Forrageiro', icon: Scale,       href: '/dashboard/balanco-forrageiro', badge: null, modulo: 'balanco_forrageiro' },
  { label: 'Lavouras',           icon: Sprout,      href: '/dashboard/talhoes',            badge: null, modulo: 'talhoes' },
  { label: 'Rebanho',            icon: CowIcon,     href: '/dashboard/rebanho',            badge: null, modulo: 'rebanho' },
  { label: 'Insumos',            icon: Package,     href: '/dashboard/insumos',            badge: null, modulo: 'insumos' },
  { label: 'Produtos',           icon: PackageOpen, href: '/dashboard/produtos',           badge: null, modulo: 'produtos' },
  { label: 'Frota',              icon: Tractor,     href: '/dashboard/frota',              badge: null, modulo: 'frota' },
  { label: 'Equipe',             icon: Users,       href: '/dashboard/mao-de-obra',        badge: null, modulo: 'mao_de_obra' },
  { label: 'Financeiro',         icon: DollarSign,  href: '/dashboard/financeiro',         badge: null, modulo: 'financeiro' },
  { label: 'Calendário',         icon: Calendar,    href: '/dashboard/calendario',         badge: null },
  { label: 'Relatórios',         icon: BarChart3,   href: '/dashboard/relatorios',         badge: null },
];

const ferramentasRoutes: RouteItem[] = [
  { label: 'Calculadoras',            icon: Calculator,    href: '/dashboard/calculadoras'          },
  { label: 'Planejamento de Silagem', icon: NotebookPen,   href: '/dashboard/planejamento-silagem'  },
  { label: 'Planejamento de Compras', icon: ShoppingCart,  href: '/dashboard/planejamento-compras', modulo: 'planejamento_compras' },
  { label: 'Assessoria agronômica',   icon: GraduationCap, href: '/dashboard/assessoria'            },
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
        className={cn(
          'text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 px-3 mr-2',
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
              'h-4 w-4 flex-shrink-0',
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


function LockedNavItem({
  icon: Icon,
  label,
  onNavigate,
}: {
  icon: React.ElementType;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href="/dashboard/configuracoes/plano?origem=sidebar"
        onClick={onNavigate}
        prefetch={false}
        className="text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 px-3 mr-2 text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.04] transition-all duration-150"
      >
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
          <span>{label}</span>
        </span>
        <Lock aria-hidden="true" className="h-3 w-3 flex-shrink-0 text-muted-foreground/40" />
      </Link>
    </li>
  );
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, planoAtual } = useAuth();

  const plano = parsePlanoSlug(planoAtual);

  const visibleGerencialRoutes = profile?.perfil === 'Operador'
    ? gerencialRoutes.filter(
        (r) =>
          r.href !== '/dashboard/mao-de-obra' &&
          r.href !== '/dashboard/balanco-forrageiro' &&
          r.href !== '/dashboard/relatorios'
      )
    : gerencialRoutes;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      className="flex flex-col h-full w-64 relative"
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

      <div className="py-6 flex-1 flex flex-col min-h-0 px-6 relative z-10">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center mb-6 group transition-all"
          aria-label="GestSilo — ir para o Dashboard"
        >
          <Image
            src="/logo_verde.png"
            alt="GestSilo"
            width={170}
            height={43}
            className="object-contain group-hover:opacity-90 transition-opacity"
            priority
            aria-hidden="true"
          />
        </Link>

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

          {/* Bloco 2 — Gerencial */}
          <nav role="navigation" aria-label="Gerencial">
            <div className="pb-2">
              <div className="px-3 py-1 text-text-faint uppercase text-xs font-bold tracking-[0.15em]">
                Gerencial
              </div>
              <ul className="space-y-0.5 list-none">
                {visibleGerencialRoutes.map((route) => {
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
                          onNavigate={onNavigate}
                        />
                      ) : (
                        <NavItem
                          href={route.href}
                          icon={route.icon}
                          label={route.label}
                          isActive={pathname === route.href}
                          onNavigate={onNavigate}
                          badge={route.badge}
                        />
                      )}
                    </div>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Separador */}
          <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

          {/* Bloco 3 — Ferramentas */}
          <nav role="navigation" aria-label="Ferramentas">
            <div className="pb-2">
              <div className="px-3 py-1 text-text-faint uppercase text-xs font-bold tracking-[0.15em]">
                Ferramentas
              </div>
              <ul className="space-y-0.5 list-none">
                {ferramentasRoutes.map((route) => {
                  const isAssessoria = route.href === '/dashboard/assessoria';

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
                        onNavigate={onNavigate}
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
              </ul>
            </div>
          </nav>

          {/* Separador */}
          <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

          {/* Bloco 4 — Sistema */}
          <nav role="navigation" aria-label="Sistema">
            <div className="pb-2">
              <div className="px-3 py-1 text-text-faint uppercase text-xs font-bold tracking-[0.15em]">
                Sistema
              </div>
              <ul className="space-y-0.5 list-none">
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
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive hover:bg-[color:var(--red-dim)] rounded-lg transition-all w-full justify-start py-1.5 px-3 h-auto text-xs font-semibold"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4 mr-2.5 flex-shrink-0" aria-hidden="true" />
          <span>Sair da conta</span>
        </Button>
      </div>
    </div>
  );
}
