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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const gerencialRoutes = [
  { label: 'Silos',       icon: Database,      href: '/dashboard/silos'                          },
  { label: 'Lavouras',    icon: Sprout,        href: '/dashboard/talhoes'                        },
  { label: 'Insumos',     icon: Package,       href: '/dashboard/insumos'                        },
  { label: 'Produtos',    icon: PackageOpen,   href: '/dashboard/produtos'                       },
  { label: 'Frota',       icon: Truck,         href: '/dashboard/frota'                          },
  { label: 'Financeiro',  icon: DollarSign,    href: '/dashboard/financeiro'                     },
  { label: 'Calendário',  icon: Calendar,      href: '/dashboard/calendario'                     },
  { label: 'Relatórios',  icon: BarChart3,     href: '/dashboard/relatorios'                     },
  { label: 'Histórico',   icon: History,       href: '/dashboard/planejamento-silagem/historico' },
];

const ferramentasRoutes = [
  { label: 'Plan. Silagem',     icon: Calculator, href: '/dashboard/planejamento-silagem' },
  { label: 'Calculadoras',      icon: Beaker,     href: '/dashboard/calculadoras'         },
  { label: 'Previsão do tempo', icon: CloudSun,   href: '/dashboard/previsao-tempo'       },
];

const sistemaRoutes = [
  { label: 'Configurações',         icon: Settings,      href: '/dashboard/configuracoes' },
  { label: 'Suporte',               icon: HelpCircle,    href: '/dashboard/suporte'       },
  { label: 'Assessoria agronômica', icon: GraduationCap, href: '/dashboard/assessoria'    },
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
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'text-xs group flex items-center font-semibold cursor-pointer rounded-lg transition-all duration-200 py-1.5 px-3',
          isActive
            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40'
            : 'text-muted-foreground hover:bg-muted dark:hover:bg-muted/80',
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            'h-4 w-4 transition-colors mr-2.5 flex-shrink-0',
            isActive ? 'text-primary' : 'text-sidebar-foreground'
          )}
        />
        <span>{label}</span>
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
    <div className="flex flex-col h-full w-60 border-r border-border shadow-sm bg-background dark:bg-sidebar dark:border-sidebar-border">
      <div className="py-6 flex-1 flex flex-col min-h-0 px-6">

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
            <div className="my-2 border-t border-sidebar-border" />

            {/* Bloco 2 — Gerencial */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  />
                ))}
              </ul>
            </div>

            {/* Separador */}
            <div className="my-2 border-t border-sidebar-border" />

            {/* Bloco 3 — Ferramentas */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
            <div className="my-2 border-t border-sidebar-border" />

            {/* Bloco 4 — Sistema */}
            <div className="pb-2">
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  />
                ))}
              </ul>
            </div>

          </nav>
        </ScrollArea>
      </div>

      {/* Rodapé — Sair */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
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
