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
  HelpCircle,
  GraduationCap,
  PawPrint,
  Heart,
  Milk,
  Scale,
  Stethoscope,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';


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
];

const sistemaRoutes: RouteItem[] = [
  { label: 'Configurações',         icon: Settings,      href: '/dashboard/configuracoes', badge: null },
  { label: 'Suporte',               icon: HelpCircle,    href: '/dashboard/suporte',       badge: null },
  { label: 'Assessoria agronômica', icon: GraduationCap, href: '/dashboard/assessoria',    badge: 'comingSoon' },
];

// const rebanhoSubRoutes: RouteItem[] = [
//   { label: 'Indicadores',    icon: BarChart3,          href: '/dashboard/rebanho/indicadores'             },
//   { label: 'Reprodução',     icon: Heart,               href: '/dashboard/rebanho/reproducao/eventos'      },
//   { label: 'Reprodutores',   icon: Dna,                 href: '/dashboard/rebanho/reproducao/reprodutores' },
//   { label: 'Parâmetros',     icon: SlidersHorizontal,   href: '/dashboard/rebanho/reproducao/parametros'   },
//   { label: 'Leiteira',       icon: Milk,                href: '/dashboard/rebanho/leiteira'                },
//   { label: 'Corte',          icon: Scale,               href: '/dashboard/rebanho/corte'                   },
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
          'text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 px-3',
          isActive
            ? 'text-[#00c45a]'
            : 'text-[#688070] hover:text-[#dceede] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150',
        )}
        style={isActive ? {
          background: 'rgba(0,196,90,0.12)',
          border: '1px solid rgba(0,196,90,0.2)',
          borderRadius: 8,
          boxShadow: '0 0 12px rgba(0,196,90,0.15)',
        } : undefined}
      >
        <span className="flex items-center gap-2">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-4 w-4 flex-shrink-0',
              isActive ? 'text-[#00c45a]' : 'text-[#688070]'
            )}
          />
          <span>{label}</span>
        </span>
        {badge === 'comingSoon' && (
          <Badge
            variant="outline"
            className="ml-1 bg-[rgba(245,208,0,0.09)] text-[#f5d000] border-[rgba(245,208,0,0.2)] text-[0.45rem] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
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
          'text-xs group flex items-center justify-between font-semibold cursor-pointer rounded-lg py-1.5 pl-8 pr-3',
          isActive
            ? 'text-[#00c45a]'
            : 'text-[#688070] hover:text-[#dceede] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150',
        )}
        style={isActive ? {
          background: 'rgba(0,196,90,0.12)',
          border: '1px solid rgba(0,196,90,0.2)',
          borderRadius: 8,
          boxShadow: '0 0 12px rgba(0,196,90,0.15)',
        } : undefined}
      >
        <span className="flex items-center gap-2">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-3 w-3 flex-shrink-0',
              isActive ? 'text-[#00c45a]' : 'text-[#688070]'
            )}
          />
          <span>{label}</span>
        </span>
        {badge === 'comingSoon' && (
          <Badge
            variant="outline"
            className="ml-1 bg-[rgba(245,208,0,0.09)] text-[#f5d000] border-[rgba(245,208,0,0.2)] text-[0.45rem] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
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
      className="flex flex-col h-full w-60 relative"
      style={{ background: '#0a140d', borderRight: '1px solid rgba(255,255,255,0.065)' }}
    >
      {/* Glow topo */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(180deg, rgba(0,196,90,0.07) 0%, transparent 100%)',
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
            <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }} />

            {/* Bloco 2 — Gerencial */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[#2a4433] uppercase text-[0.475rem] font-bold tracking-[0.15em]">
                Gerencial
              </div>
              <ul className="space-y-0.5 list-none">
                {gerencialRoutes.map((route) => (
                  <div key={route.href}>
                    <NavItem
                      href={route.href}
                      icon={route.icon}
                      label={route.label}
                      isActive={pathname === route.href}
                      onNavigate={onNavigate}
                      badge={route.badge}
                    />
                  </div>
                ))}
              </ul>
            </div>

            {/* Separador */}
            <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }} />

            {/* Bloco 3 — Ferramentas */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[#2a4433] uppercase text-[0.475rem] font-bold tracking-[0.15em]">
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
            <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }} />

            {/* Bloco 4 — Sistema */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[#2a4433] uppercase text-[0.475rem] font-bold tracking-[0.15em]">
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
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }}>
        <Button
          variant="ghost"
          className="text-[#688070] hover:text-[#e05454] hover:bg-[rgba(224,84,84,0.08)] rounded-lg transition-all w-full justify-start py-1.5 px-3 h-auto text-xs font-semibold"
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
