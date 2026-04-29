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
    <Alert className="border-status-warning/30 bg-status-warning/10 mb-6">
      <AlertCircle className="h-4 w-4 text-status-warning" />
      <AlertDescription className="text-status-warning">
        <strong>Em breve:</strong> {message}
      </AlertDescription>
    </Alert>
  );
}
