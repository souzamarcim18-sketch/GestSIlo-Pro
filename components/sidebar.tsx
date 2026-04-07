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
  Calculator
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
    label: 'Planejador',
    icon: Calculator,
    href: '/dashboard/rebanho',
    color: 'text-rose-500',
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
    <div className="flex flex-col h-full border-r border-green-100 shadow-sm" style={{ background: '#e8f5e9' }}>
      <div className="px-6 py-8 flex-1 flex flex-col min-h-0">
        <Link href="/dashboard" className="flex items-center gap-3 mb-10 group transition-all">
          <Image 
            src="/logo.png" 
            alt="GestSilo" 
            width={48} 
            height={48} 
            className="rounded-xl shadow-md object-contain group-hover:scale-105 transition-transform" 
            referrerPolicy="no-referrer" 
          />
          <div className="flex flex-col -space-y-1">
            <span className="font-black text-xl tracking-tight" style={{ color: '#00A651' }}>Gest</span>
            <span className="font-black text-xl tracking-tight" style={{ color: '#6B8E23' }}>Silo</span>
          </div>
        </Link>
        
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-1 pb-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-semibold cursor-pointer rounded-xl transition-all duration-200",
                  pathname === route.href 
                    ? "bg-white text-green-700 shadow-sm border border-green-50" 
                    : "text-gray-600 hover:bg-white/50 hover:text-green-600",
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon className={cn(
                    "h-5 w-5 mr-3 transition-colors", 
                    pathname === route.href ? "text-green-600" : "text-gray-400 group-hover:text-green-500"
                  )} />
                  {route.label}
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="p-4 border-t border-green-100 bg-white/30">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" 
          onClick={() => {}}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
