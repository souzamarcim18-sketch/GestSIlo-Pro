'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface ResultCardProps {
  title: string;
  value: number | string;
  unit: string;
  subtitle?: string;
  subtitleValue?: number | string;
  subtitleUnit?: string;
  icon?: ReactNode;
  color?: 'primary' | 'info' | 'warning' | 'destructive';
  tips?: string[];
  details?: { label: string; value: string | number }[];
  className?: string;
}

export function ResultCard({
  title,
  value,
  unit,
  subtitle,
  subtitleValue,
  subtitleUnit,
  icon,
  color = 'primary',
  tips,
  details,
  className,
}: ResultCardProps) {
  const colorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    primary: {
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      text: 'text-primary',
      badge: 'bg-primary/20 text-primary',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-900',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-200 dark:border-yellow-900',
      text: 'text-yellow-700 dark:text-yellow-400',
      badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
    },
    destructive: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-900',
      text: 'text-red-700 dark:text-red-400',
      badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300',
    },
  };

  const colorClass = colorClasses[color];

  return (
    <Card className={`border-l-4 ${colorClass.border} ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className={`flex items-center gap-2 text-lg ${colorClass.text}`}>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Result */}
        <div className={`${colorClass.bg} rounded-lg p-6 text-center`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {title}
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span className={`text-4xl font-bold ${colorClass.text}`}>
              {typeof value === 'number' ? value.toFixed(2) : value}
            </span>
            <span className={`text-lg font-semibold ${colorClass.text}`}>{unit}</span>
          </div>
        </div>

        {/* Subtitle / Secondary Info */}
        {subtitle && subtitleValue !== undefined && (
          <div className="rounded-lg border border-muted bg-muted/30 p-4 text-center">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              {subtitle}
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-2xl font-bold ${colorClass.text}`}>
                {typeof subtitleValue === 'number'
                  ? subtitleValue.toFixed(1)
                  : subtitleValue}
              </span>
              {subtitleUnit && <span className="text-sm font-medium">{subtitleUnit}</span>}
            </div>
          </div>
        )}

        {/* Details / Breakdown */}
        {details && details.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            {details.map((detail, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-semibold">
                  {typeof detail.value === 'number' ? detail.value.toFixed(2) : detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tips / Recommendations */}
        {tips && tips.length > 0 && (
          <div className="space-y-2">
            {tips.map((tip, idx) => (
              <Alert key={idx} className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                  {tip}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
