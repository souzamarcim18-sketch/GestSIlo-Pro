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
      className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto pb-2 mb-4"
      aria-label="Navegação por breadcrumb"
    >
      {/* Home */}
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Voltar ao Dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Segmentos dinâmicos */}
      {segments.map((segment: BreadcrumbSegment, index: number) => {
        const isLast = index === segments.length - 1;
        const label = segment.label;

        return (
          <div key={segment.href} className="flex items-center gap-2 flex-shrink-0">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />

            {segment.isLoading ? (
              // Skeleton enquanto busca o nome
              <Skeleton className="h-4 w-20" />
            ) : (
              <Link
                href={segment.href}
                className={cn(
                  "hover:text-foreground transition-colors whitespace-nowrap",
                  isLast && "font-semibold text-foreground pointer-events-none"
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {/* Truncar texto longo com ellipsis */}
                <span className="max-w-[120px] truncate inline-block">
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
