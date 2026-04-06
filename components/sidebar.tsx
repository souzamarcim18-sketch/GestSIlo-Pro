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
  Sprout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-sky-500',
  },
  {
    label: 'Silos',
    icon: Database,
    href: '/dashboard/silos',
    color: 'text-amber-500',
  },
  {
    label: 'Talhões',
    icon: Map,
    href: '/dashboard/talhoes',
    color: 'text-emerald-500',
  },
  {
    label: 'Insumos',
    icon: Package,
    href: '/dashboard/insumos',
    color: 'text-blue-500',
  },
  {
    label: 'Frota',
    icon: Truck,
    href: '/dashboard/frota',
    color: 'text-orange-500',
  },
  {
    label: 'Financeiro',
    icon: DollarSign,
    href: '/dashboard/financeiro',
    color: 'text-green-500',
  },
  {
    label: 'Relatórios',
    icon: BarChart3,
    href: '/dashboard/relatorios',
    color: 'text-purple-500',
  },
  {
    label: 'Configurações',
    icon: Settings,
    href: '/dashboard/configuracoes',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-3">
            <Image src="/logo.png" alt="GestSilo" width={32} height={32} className="object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-xl font-bold">
            <span style={{ color: '#00A651' }}>Gest</span>
            <span style={{ color: '#6B8E23' }}>Silo</span>
          </h1>
        </Link>
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition",
                  pathname === route.href ? "text-sidebar-foreground bg-sidebar-accent" : "text-sidebar-foreground/70",
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                  {route.label}
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="px-3 py-2">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => {}}>
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
}
