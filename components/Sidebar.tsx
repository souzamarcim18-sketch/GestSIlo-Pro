'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  Sprout,
  Calculator,
  Beaker,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const operacionalRoutes = [
  { label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard'                },
  { label: 'Silos',       icon: Database,        href: '/dashboard/silos'           },
  { label: 'Talhões',     icon: Map,             href: '/dashboard/talhoes'         },
  { label: 'Rebanho',     icon: Sprout,          href: '/dashboard/rebanho'         },
  { label: 'Insumos',     icon: Package,         href: '/dashboard/insumos'         },
  { label: 'Frota',       icon: Truck,           href: '/dashboard/frota'           },
  { label: 'Financeiro',  icon: DollarSign,      href: '/dashboard/financeiro'      },
];

const ferramentasRoutes = [
  { label: 'Planejador',   icon: Calculator, href: '/dashboard/planejador'  },
  { label: 'Calculadoras', icon: Beaker,     href: '/dashboard/calculadoras' },
  { label: 'Relatórios',   icon: BarChart3,  href: '/dashboard/relatorios'   },
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

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        setCollapsed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full border-r border-border shadow-sm transition-all duration-300",
        "bg-background dark:bg-sidebar dark:border-sidebar-border",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div className={cn("py-8 flex-1 flex flex-col min-h-0", collapsed ? "px-3" : "px-6")}>

        {/* Logo */}
        <Link
          href="/dashboard"
          className={cn("flex items-center gap-3 mb-10 group transition-all", collapsed && "justify-center")}
          aria-label="GestSilo — ir para o Dashboard"
        >
          <Image
            src="/logo.png?v=2"
            alt=""
            width={48}
            height={48}
            className="rounded-xl shadow-md object-contain group-hover:scale-105 transition-transform"
            unoptimized
            aria-hidden="true"
          />
          {!collapsed && (
            <div className="flex flex-col -space-y-1" aria-hidden="true">
              <span className="font-black text-xl tracking-tight text-foreground">Gest</span>
              <span className="font-black text-xl tracking-tight text-foreground">Silo</span>
            </div>
          )}
        </Link>

        {/* Navegação */}
        <ScrollArea className={cn("flex-1 min-h-0 h-full", collapsed ? "-mx-1 px-1" : "-mx-2 px-2")}>
          <nav aria-label="Navegação principal">
            {/* Grupo Operacional */}
            <div className="pb-4">
              {!collapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Operacional
                </div>
              )}
              <ul className={cn("space-y-1 list-none", collapsed && "space-y-2")}>
                {operacionalRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  const linkContent = (
                    <Link
                      href={route.href}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        "text-sm group flex font-semibold cursor-pointer rounded-xl transition-all duration-200",
                        collapsed ? "p-3 justify-center" : "p-3 justify-start",
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40"
                          : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/80",
                      )}
                    >
                      <route.icon
                        aria-hidden="true"
                        className={cn(
                          "h-5 w-5 transition-colors",
                          !collapsed && "mr-3",
                          isActive ? "text-primary" : "text-sidebar-foreground"
                        )}
                      />
                      {!collapsed && route.label}
                    </Link>
                  );

                  return (
                    <li key={route.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger>
                            {linkContent}
                            <TooltipContent side="right">
                              {route.label}
                            </TooltipContent>
                          </TooltipTrigger>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Separador */}
            {!collapsed && <div className="my-2 border-t border-sidebar-border" />}

            {/* Grupo Ferramentas */}
            <div className="pb-4">
              {!collapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ferramentas
                </div>
              )}
              <ul className={cn("space-y-1 list-none", collapsed && "space-y-2")}>
                {ferramentasRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  const linkContent = (
                    <Link
                      href={route.href}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        "text-sm group flex font-semibold cursor-pointer rounded-xl transition-all duration-200",
                        collapsed ? "p-3 justify-center" : "p-3 justify-start",
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40"
                          : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/80",
                      )}
                    >
                      <route.icon
                        aria-hidden="true"
                        className={cn(
                          "h-5 w-5 transition-colors",
                          !collapsed && "mr-3",
                          isActive ? "text-primary" : "text-sidebar-foreground"
                        )}
                      />
                      {!collapsed && route.label}
                    </Link>
                  );

                  return (
                    <li key={route.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger>
                            {linkContent}
                            <TooltipContent side="right">
                              {route.label}
                            </TooltipContent>
                          </TooltipTrigger>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Separador */}
            {!collapsed && <div className="my-2 border-t border-sidebar-border" />}

            {/* Grupo Sistema */}
            <div className="pb-4">
              {!collapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sistema
                </div>
              )}
              <ul className={cn("space-y-1 list-none", collapsed && "space-y-2")}>
                {sistemaRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  const linkContent = (
                    <Link
                      href={route.href}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        "text-sm group flex font-semibold cursor-pointer rounded-xl transition-all duration-200",
                        collapsed ? "p-3 justify-center" : "p-3 justify-start",
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/30 dark:border-primary/40"
                          : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/80",
                      )}
                    >
                      <route.icon
                        aria-hidden="true"
                        className={cn(
                          "h-5 w-5 transition-colors",
                          !collapsed && "mr-3",
                          isActive ? "text-primary" : "text-sidebar-foreground"
                        )}
                      />
                      {!collapsed && route.label}
                    </Link>
                  );

                  return (
                    <li key={route.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger>
                            {linkContent}
                            <TooltipContent side="right">
                              {route.label}
                            </TooltipContent>
                          </TooltipTrigger>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </ScrollArea>
      </div>

      {/* Rodapé — Toggle + Sair */}
      <div className={cn("p-4 border-t border-sidebar-border bg-sidebar/50 space-y-2", collapsed && "px-2")}>
        <Button
          variant="ghost"
          className={cn(
            "rounded-xl transition-all hover:bg-muted dark:hover:bg-muted/80",
            collapsed ? "w-full flex justify-center p-3" : "w-full justify-center p-3"
          )}
          onClick={toggleCollapse}
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-xl transition-all",
            collapsed ? "w-full flex justify-center p-3" : "w-full justify-start p-3"
          )}
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} aria-hidden="true" />
          {!collapsed && "Sair da conta"}
        </Button>
      </div>
    </div>
  );
}
