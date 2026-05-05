'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
  badge?: number;
  icon?: React.ReactNode;
}

interface TabsNavProps {
  badgeRepetidoras?: number;
}

export function TabsNav({ badgeRepetidoras = 0 }: TabsNavProps) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: 'Calendário', href: '/dashboard/rebanho/reproducao' },
    { label: 'Eventos', href: '/dashboard/rebanho/reproducao/eventos' },
    { label: 'Indicadores', href: '/dashboard/rebanho/reproducao/indicadores' },
    {
      label: 'Repetidoras',
      href: '/dashboard/rebanho/reproducao/repetidoras',
      badge: badgeRepetidoras,
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    { label: 'Reprodutores', href: '/dashboard/rebanho/reproducao/reprodutores' },
    { label: 'Parâmetros', href: '/dashboard/rebanho/reproducao/parametros' },
  ];

  return (
    <div className="border-b border-border/40 px-4 sm:px-6">
      <nav className="flex gap-6" aria-label="Reprodução">
        {tabs.map((tab) => {
          // Para a aba raiz "Calendário", usar igualdade exata
          const isActive =
            tab.href === '/dashboard/rebanho/reproducao'
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
                isActive
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
