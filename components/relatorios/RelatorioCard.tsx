'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportButtons } from './ExportButtons';
import { ArrowRight } from 'lucide-react';

export interface RelatorioCardProps {
  titulo: string;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
  formatos: Array<'excel' | 'pdf'>;
  onExport: (formato: 'excel' | 'pdf') => Promise<void>;
  isLoading?: boolean;
  loadingFormato?: 'excel' | 'pdf';
  disabled?: boolean;
  href?: string;
  children?: React.ReactNode;
}

export function RelatorioCard({
  titulo,
  descricao,
  icone: Icone,
  formatos,
  onExport,
  isLoading,
  loadingFormato,
  disabled,
  href,
  children,
}: RelatorioCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
          <Icone className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1 flex-1">
          <CardTitle className="text-base">{titulo}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{descricao}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 mt-auto">
        {children}
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center justify-center w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Acessar
            <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        ) : (
          <ExportButtons
            formatos={formatos}
            onExport={onExport}
            isLoading={isLoading}
            loadingFormato={loadingFormato}
            disabled={disabled}
          />
        )}
      </CardContent>
    </Card>
  );
}
