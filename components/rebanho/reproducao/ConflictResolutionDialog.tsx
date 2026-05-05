'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ConflictoSync {
  id: string;
  tipo_evento: string;
  animal_id: string;
  data_evento: string;
  _conflict_motivo?: string;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflitos: ConflictoSync[];
  isAdmin: boolean;
  onResolver: (id: string, acao: 'descartar' | 'forcar') => Promise<void>;
}

const motivoLabels: Record<string, string> = {
  animal_morto: 'Animal marcado como Morto',
  animal_vendido: 'Animal Vendido',
};

const tipoLabels: Record<string, string> = {
  cobertura: 'Cobertura',
  diagnostico_prenhez: 'Diagnóstico de Prenhez',
  parto: 'Parto',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
};

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflitos,
  isAdmin,
  onResolver,
}: ConflictResolutionDialogProps) {
  const [resolvendo, setResolvendo] = useState<string | null>(null);

  const handleResolver = async (id: string, acao: 'descartar' | 'forcar') => {
    setResolvendo(id);
    try {
      await onResolver(id, acao);
    } finally {
      setResolvendo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Conflitos de Sincronização
          </DialogTitle>
          <DialogDescription>
            Os eventos abaixo não puderam ser sincronizados porque o animal mudou de status
            durante o período offline. Revise e escolha uma ação para cada um.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full pr-4">
          <div className="space-y-3">
            {conflitos.map((conflito) => (
              <div
                key={conflito.id}
                className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {tipoLabels[conflito.tipo_evento] || conflito.tipo_evento}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Animal: {conflito.animal_id.slice(0, 8)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-red-600">
                      {motivoLabels[conflito._conflict_motivo || ''] || 'Conflito desconhecido'}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Data do evento: {new Date(conflito.data_evento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResolver(conflito.id, 'descartar')}
                    disabled={resolvendo === conflito.id}
                  >
                    {resolvendo === conflito.id && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    Descartar
                  </Button>

                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolver(conflito.id, 'forcar')}
                      disabled={resolvendo === conflito.id}
                    >
                      {resolvendo === conflito.id && (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      Forçar sincronização
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
