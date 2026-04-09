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
  Sprout,
  Calculator,
  Beaker
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      className="flex flex-col h-full border-r border-green-100 shadow-sm"
      style={{ background: '#e8f5e9' }}
    >
      <div className="px-6 py-8 flex-1 flex flex-col min-h-0">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 mb-10 group transition-all"
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
          <div className="flex flex-col -space-y-1" aria-hidden="true">
            <span className="font-black text-xl tracking-tight" style={{ color: '#00A651' }}>Gest</span>
            <span className="font-black text-xl tracking-tight" style={{ color: '#6B8E23' }}>Silo</span>
          </div>
        </Link>

        {/* Navegação */}
        <ScrollArea className="flex-1 -mx-2 px-2 min-h-0 h-full">
          <nav aria-label="Navegação principal">
            <ul className="space-y-1 pb-4 list-none">
              {routes.map((route) => {
                const isActive = pathname === route.href;
                return (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        "text-sm group flex p-3 w-full justify-start font-semibold cursor-pointer rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-white text-green-700 shadow-sm border border-green-50"
                          : "text-gray-600 hover:bg-white/50 hover:text-green-600",
                      )}
                    >
                      <route.icon
                        aria-hidden="true"
                        className={cn(
                          "h-5 w-5 mr-3 transition-colors",
                          isActive ? "text-green-600" : "text-gray-400 group-hover:text-green-500"
                        )}
                      />
                      {route.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </ScrollArea>
      </div>

      {/* Rodapé — Sair */}
      <div className="p-4 border-t border-green-100 bg-white/30">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut className="h-5 w-5 mr-3" aria-hidden="true" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
