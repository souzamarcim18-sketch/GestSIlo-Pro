'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Sprout,
  Package,
  PackageOpen,
  Truck,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Calculator,
  Beaker,
  Calendar,
  History,
  CloudSun,
  HelpCircle,
  GraduationCap,
  PawPrint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Gradiente metálico prateado-esverdeado (somente light)
const BG_SIDEBAR_METAL =
  'linear-gradient(180deg, #e8efe5 0%, #f0f3ed 25%, #e3ebe0 60%, #d8e2d4 100%)';

type RouteItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: 'comingSoon' | null;
};

const gerencialRoutes: RouteItem[] = [
  { label: 'Silos',       icon: Database,      href: '/dashboard/silos',                          badge: null },
  { label: 'Lavouras',    icon: Sprout,        href: '/dashboard/talhoes',                        badge: null },
  { label: 'Rebanho',     icon: PawPrint,      href: '/dashboard/rebanho',                        badge: null },
  { label: 'Insumos',     icon: Package,       href: '/dashboard/insumos',                        badge: null },
  { label: 'Produtos',    icon: PackageOpen,   href: '/dashboard/produtos',                       badge: 'comingSoon' },
  { label: 'Frota',       icon: Truck,         href: '/dashboard/frota',                          badge: null },
  { label: 'Financeiro',  icon: DollarSign,    href: '/dashboard/financeiro',                     badge: null },
  { label: 'Calendário',  icon: Calendar,      href: '/dashboard/calendario',                     badge: null },
  { label: 'Relatórios',  icon: BarChart3,     href: '/dashboard/relatorios',                     badge: null },
  { label: 'Histórico',   icon: History,       href: '/dashboard/planejamento-silagem/historico', badge: null },
];

const ferramentasRoutes: RouteItem[] = [
  { label: 'Plan. Silagem',     icon: Calculator, href: '/dashboard/planejamento-silagem' },
  { label: 'Calculadoras',      icon: Beaker,     href: '/dashboard/calculadoras'         },
  { label: 'Previsão do tempo', icon: CloudSun,   href: '/dashboard/previsao-tempo'       },
];

const sistemaRoutes: RouteItem[] = [
  { label: 'Configurações',         icon: Settings,      href: '/dashboard/configuracoes', badge: null },
  { label: 'Suporte',               icon: HelpCircle,    href: '/dashboard/suporte',       badge: null },
  { label: 'Assessoria agronômica', icon: GraduationCap, href: '/dashboard/assessoria',    badge: 'comingSoon' },
];

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
          'text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg transition-all duration-200 py-1.5 px-3',
          isActive
            ? 'bg-gradient-to-r from-primary/25 to-primary/10 text-brand-deep shadow-sm border border-primary/40 dark:text-foreground dark:border-primary/40'
            : 'text-foreground/70 hover:bg-white/60 hover:text-brand-deep dark:text-muted-foreground dark:hover:bg-muted/80 dark:hover:text-foreground',
        )}
      >
        <span className="flex items-center gap-2">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-4 w-4 transition-colors flex-shrink-0',
              isActive ? 'text-brand-primary' : 'text-foreground/60 dark:text-sidebar-foreground'
            )}
          />
          <span>{label}</span>
        </span>
        {badge === 'comingSoon' && (
          <Badge
            variant="outline"
            className="text-[10px] ml-1 bg-status-warning/15 text-status-warning border-status-warning/30"
          >
            Em breve
          </Badge>
        )}
      </Link>
    </li>
  );
}


export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      className="flex flex-col h-full w-60 border-r border-border/60 shadow-md dark:bg-sidebar dark:border-sidebar-border"
      style={{ background: BG_SIDEBAR_METAL }}
    >
      {/* No dark mode, sobrescreve o gradiente com a cor sólida do sidebar */}
      <style jsx>{`
        @media (prefers-color-scheme: dark) {
          div {
            background: hsl(var(--sidebar)) !important;
          }
        }
      `}</style>

      <div className="py-6 flex-1 flex flex-col min-h-0 px-6 relative">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center mb-6 group transition-all"
          aria-label="GestSilo — ir para o Dashboard"
        >
          <Image
            src="/logo_degrad-hor.png"
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
          <nav aria-label="Navegação principal">

            {/* Bloco 1 — Dashboard */}
            <ul className="space-y-0.5 list-none pb-2">
              <NavItem
                href="/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                isActive={pathname === '/dashboard'}
                onNavigate={onNavigate}
              />
            </ul>

            {/* Separador */}
            <div className="my-2 border-t border-foreground/10 dark:border-sidebar-border" />

            {/* Bloco 2 — Gerencial */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[10px] font-semibold text-foreground/50 dark:text-muted-foreground uppercase tracking-wider">
                Gerencial
              </div>
              <ul className="space-y-0.5 list-none">
                {gerencialRoutes.map((route) => (
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
              </ul>
            </div>

            {/* Separador */}
            <div className="my-2 border-t border-foreground/10 dark:border-sidebar-border" />

            {/* Bloco 3 — Ferramentas */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[10px] font-semibold text-foreground/50 dark:text-muted-foreground uppercase tracking-wider">
                Ferramentas
              </div>
              <ul className="space-y-0.5 list-none">
                {ferramentasRoutes.map((route) => (
                  <NavItem
                    key={route.href}
                    href={route.href}
                    icon={route.icon}
                    label={route.label}
                    isActive={pathname === route.href}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>

            {/* Separador */}
            <div className="my-2 border-t border-foreground/10 dark:border-sidebar-border" />

            {/* Bloco 4 — Sistema */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[10px] font-semibold text-foreground/50 dark:text-muted-foreground uppercase tracking-wider">
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
              </ul>
            </div>

          </nav>
        </ScrollArea>
      </div>

      {/* Rodapé — Sair */}
      <div className="p-4 border-t border-foreground/10 dark:border-sidebar-border bg-white/30 dark:bg-sidebar/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-lg transition-all w-full justify-start py-1.5 px-3 h-auto text-xs font-semibold"
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
