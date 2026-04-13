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
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const routes = [
  { label: 'Dashboard',     icon: LayoutDashboard, href: '/dashboard',                  color: 'text-sky-500'     },
  { label: 'Silos',         icon: Database,        href: '/dashboard/silos',             color: 'text-amber-500'   },
  { label: 'Planejador',    icon: Calculator,      href: '/dashboard/rebanho',           color: 'text-rose-500'    },
  { label: 'Simulador',     icon: Sprout,          href: '/dashboard/simulador',         color: 'text-lime-600'    },
  { label: 'Calculadoras',  icon: Beaker,          href: '/dashboard/calculadoras',      color: 'text-indigo-500'  },
  { label: 'Talhões',       icon: Map,             href: '/dashboard/talhoes',           color: 'text-emerald-500' },
  { label: 'Insumos',       icon: Package,         href: '/dashboard/insumos',           color: 'text-blue-500'    },
  { label: 'Frota',         icon: Truck,           href: '/dashboard/frota',             color: 'text-orange-500'  },
  { label: 'Financeiro',    icon: DollarSign,      href: '/dashboard/financeiro',        color: 'text-green-500'   },
  { label: 'Relatórios',    icon: BarChart3,       href: '/dashboard/relatorios',        color: 'text-purple-500'  },
  { label: 'Configurações', icon: Settings,        href: '/dashboard/configuracoes',                               },
];

export function Sidebar() {
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
        "flex flex-col h-full border-r border-green-100 shadow-sm transition-all duration-300",
        "bg-white dark:bg-sidebar dark:border-sidebar-border",
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
              <span className="font-black text-xl tracking-tight text-green-600 dark:text-green-400">Gest</span>
              <span className="font-black text-xl tracking-tight text-green-700 dark:text-green-500">Silo</span>
            </div>
          )}
        </Link>

        {/* Navegação */}
        <ScrollArea className={cn("flex-1 min-h-0 h-full", collapsed ? "-mx-1 px-1" : "-mx-2 px-2")}>
          <nav aria-label="Navegação principal">
            <ul className={cn("space-y-1 pb-4 list-none", collapsed && "space-y-2")}>
              {routes.map((route) => {
                const isActive = pathname === route.href;
                return (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? route.label : undefined}
                      className={cn(
                        "text-sm group flex font-semibold cursor-pointer rounded-xl transition-all duration-200",
                        collapsed ? "p-3 justify-center" : "p-3 justify-start",
                        isActive
                          ? "bg-white dark:bg-primary text-green-700 dark:text-sidebar shadow-sm border border-green-50 dark:border-primary"
                          : "text-gray-600 dark:text-sidebar-foreground hover:bg-white/50 dark:hover:bg-primary/20 hover:text-green-600 dark:hover:text-primary",
                      )}
                    >
                      <route.icon
                        aria-hidden="true"
                        className={cn(
                          "h-5 w-5 transition-colors",
                          !collapsed && "mr-3",
                          isActive ? "text-green-600 dark:text-sidebar" : "text-gray-400 dark:text-gray-500 group-hover:text-green-500"
                        )}
                      />
                      {!collapsed && route.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </ScrollArea>
      </div>

      {/* Rodapé — Toggle + Sair */}
      <div className={cn("p-4 border-t border-green-100 dark:border-sidebar-border bg-white/30 dark:bg-sidebar/50 space-y-2", collapsed && "px-2")}>
        <Button
          variant="ghost"
          className={cn(
            "rounded-xl transition-all dark:hover:bg-primary/20",
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
            "text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-all",
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
