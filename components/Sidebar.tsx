'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Map,
  Package,
  Truck,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Calculator,
  Beaker,
  Calendar,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const operacionalRoutes = [
  { label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard'                },
  { label: 'Silos',       icon: Database,        href: '/dashboard/silos'           },
  { label: 'Talhões',     icon: Map,             href: '/dashboard/talhoes'         },
  { label: 'Calendário',  icon: Calendar,        href: '/dashboard/calendario'      },
  { label: 'Insumos',     icon: Package,         href: '/dashboard/insumos'         },
  { label: 'Frota',       icon: Truck,           href: '/dashboard/frota'           },
  { label: 'Financeiro',  icon: DollarSign,      href: '/dashboard/financeiro'      },
];

const ferramentasRoutes = [
  { label: 'Plan. Silagem', icon: Calculator,     href: '/dashboard/planejamento-silagem'            },
  { label: 'Histórico',     icon: History,        href: '/dashboard/planejamento-silagem/historico'  },
  { label: 'Calculadoras',  icon: Beaker,        href: '/dashboard/calculadoras'                    },
  { label: 'Relatórios',    icon: BarChart3,     href: '/dashboard/relatorios'                      },
];

const sistemaRoutes = [
  { label: 'Configurações', icon: Settings, href: '/dashboard/configuracoes' },
];

interface SidebarProps {
  onNavigate?: () => void;
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
      <div className="py-8 flex-1 flex flex-col min-h-0 px-6">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center mb-10 group transition-all"
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
            {/* Grupo Operacional */}
            <div className="pb-4">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Operacional
              </div>
              <ul className="space-y-1 list-none">
                {operacionalRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  return (
                    <li key={route.href}>
                      <Link
                        href={route.href}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          "text-sm group flex items-center font-semibold cursor-pointer rounded-xl transition-all duration-200 p-3",
                          isActive
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40"
                            : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/80",
                        )}
                      >
                        <route.icon
                          aria-hidden="true"
                          className={cn(
                            "h-5 w-5 transition-colors mr-3",
                            isActive ? "text-primary" : "text-sidebar-foreground"
                          )}
                        />
                        <span>{route.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Separador */}
            <div className="my-2 border-t border-sidebar-border" />

            {/* Grupo Ferramentas */}
            <div className="pb-4">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ferramentas
              </div>
              <ul className="space-y-1 list-none">
                {ferramentasRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  return (
                    <li key={route.href}>
                      <Link
                        href={route.href}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          "text-sm group flex items-center font-semibold cursor-pointer rounded-xl transition-all duration-200 p-3",
                          isActive
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40"
                            : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/80",
                        )}
                      >
                        <route.icon
                          aria-hidden="true"
                          className={cn(
                            "h-5 w-5 transition-colors mr-3",
                            isActive ? "text-primary" : "text-sidebar-foreground"
                          )}
                        />
                        <span>{route.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Separador */}
            <div className="my-2 border-t border-sidebar-border" />

            {/* Grupo Sistema */}
            <div className="pb-4">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sistema
              </div>
              <ul className="space-y-1 list-none">
                {sistemaRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  return (
                    <li key={route.href}>
                      <Link
                        href={route.href}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          "text-sm group flex items-center font-semibold cursor-pointer rounded-xl transition-all duration-200 p-3",
                          isActive
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40"
                            : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/80",
                        )}
                      >
                        <route.icon
                          aria-hidden="true"
                          className={cn(
                            "h-5 w-5 transition-colors mr-3",
                            isActive ? "text-primary" : "text-sidebar-foreground"
                          )}
                        />
                        <span>{route.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </ScrollArea>
      </div>

      {/* Rodapé — Sair */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-xl transition-all w-full justify-start p-3"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut className="h-5 w-5 mr-3" aria-hidden="true" />
          <span>Sair da conta</span>
        </Button>
      </div>
    </div>
  );
}
