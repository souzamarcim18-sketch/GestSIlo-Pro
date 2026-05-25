'use client';

import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

export interface ExportButtonsProps {
  formatos: Array<'excel' | 'pdf'>;
  onExport: (formato: 'excel' | 'pdf') => Promise<void>;
  isLoading?: boolean;
  loadingFormato?: 'excel' | 'pdf';
  disabled?: boolean;
}

export function ExportButtons({
  formatos,
  onExport,
  isLoading,
  loadingFormato,
  disabled,
}: ExportButtonsProps) {
  return (
    <div className="flex gap-2 w-full">
      {formatos.includes('excel') && (
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled || isLoading}
          onClick={() => onExport('excel')}
          aria-label="Exportar em Excel"
        >
          {isLoading && loadingFormato === 'excel' ? (
            <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Gerando...</>
          ) : (
            <><FileSpreadsheet className="mr-2 h-3 w-3" />Excel</>
          )}
        </Button>
      )}
      {formatos.includes('pdf') && (
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled || isLoading}
          onClick={() => onExport('pdf')}
          aria-label="Exportar em PDF"
        >
          {isLoading && loadingFormato === 'pdf' ? (
            <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Gerando...</>
          ) : (
            <><FileText className="mr-2 h-3 w-3" />PDF</>
          )}
        </Button>
      )}
    </div>
  );
}
