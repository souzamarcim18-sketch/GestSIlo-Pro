'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreadcrumbData, type BreadcrumbSegment } from '@/hooks/useBreadcrumbData';
import { Skeleton } from '@/components/ui/skeleton';

export function Breadcrumbs() {
  const segments = useBreadcrumbData();

  if (segments.length === 0) {
    return null; // Não mostrar breadcrumb se estiver vazio
  }

  return (
    <nav
      className="flex items-center gap-1.5 text-sm overflow-x-auto"
      aria-label="Navegação por breadcrumb"
    >
      {/* Home */}
      <Link
        href="/dashboard"
        className="flex items-center transition-colors flex-shrink-0 text-[#688070] hover:text-[#dceede]"
        aria-label="Voltar ao Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {/* Segmentos dinâmicos */}
      {segments.map((segment: BreadcrumbSegment, index: number) => {
        const isLast = index === segments.length - 1;
        const label = segment.label;

        return (
          <div key={segment.href} className="flex items-center gap-1.5 flex-shrink-0">
            <ChevronRight className="h-3 w-3 text-[#2a4433]" aria-hidden="true" />

            {segment.isLoading ? (
              <Skeleton className="h-3.5 w-20" />
            ) : (
              <Link
                href={segment.href}
                className={cn(
                  'transition-colors whitespace-nowrap text-xs leading-none',
                  isLast
                    ? 'font-semibold text-[#dceede] pointer-events-none'
                    : 'text-[#688070] hover:text-[#dceede]'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                <span className="max-w-[140px] truncate inline-block align-middle">
                  {label}
                </span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
