'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ComingSoonBannerProps {
  message?: string;
}

export function ComingSoonBanner({
  message = 'Este módulo está em desenvolvimento e será lançado em breve.'
}: ComingSoonBannerProps) {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 mb-6">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <strong>Em breve:</strong> {message}
      </AlertDescription>
    </Alert>
  );
}
