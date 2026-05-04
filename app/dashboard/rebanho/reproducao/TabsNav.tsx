'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
}

const tabs: Tab[] = [
  { label: 'Eventos', href: '/dashboard/rebanho/reproducao/eventos' },
  { label: 'Reprodutores', href: '/dashboard/rebanho/reproducao/reprodutores' },
  { label: 'Parâmetros', href: '/dashboard/rebanho/reproducao/parametros' },
];

export function TabsNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/40 px-4 sm:px-6">
      <nav className="flex gap-6" aria-label="Reprodução">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
