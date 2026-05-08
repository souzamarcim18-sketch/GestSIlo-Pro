'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CoberturaForm } from './eventos/CoberturaForm';
import { DiagnosticoForm } from './eventos/DiagnosticoForm';
import { PartoForm } from './eventos/PartoForm';
import { SecagemForm } from './eventos/SecagemForm';
import { AbortoForm } from './eventos/AbortoForm';
import { DescarteForm } from './eventos/DescarteForm';
import { TipoEventoSelector } from './eventos/TipoEventoSelector';

export type TipoEventoReprodutivo =
  | 'cobertura'
  | 'diagnostico_prenhez'
  | 'parto'
  | 'secagem'
  | 'aborto'
  | 'descarte';

interface RegistroEventoDialogProps {
  animalId?: string;
  onSuccess?: () => void;
}

export function RegistroEventoDialog({ animalId, onSuccess }: RegistroEventoDialogProps) {
  const [open, setOpen] = useState(false);
  const [tipoEvento, setTipoEvento] = useState<TipoEventoReprodutivo | null>(null);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setTipoEvento(null);
    onSuccess?.();
  }, [onSuccess]);

  const handleBack = useCallback(() => {
    setTipoEvento(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger onClick={() => setOpen(true)}>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tipoEvento ? 'Registrar Evento Reprodutivo' : 'Selecionar Tipo de Evento'}
          </DialogTitle>
          <DialogDescription>
            {tipoEvento
              ? 'Preencha os detalhes do evento reprodutivo'
              : 'Escolha qual tipo de evento você deseja registrar'}
          </DialogDescription>
        </DialogHeader>

        {!tipoEvento ? (
          <TipoEventoSelector onSelect={setTipoEvento} />
        ) : (
          <>
            {tipoEvento === 'cobertura' && (
              <CoberturaForm
                animalId={animalId}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            )}
            {tipoEvento === 'diagnostico_prenhez' && (
              <DiagnosticoForm
                animalId={animalId}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            )}
            {tipoEvento === 'parto' && (
              <PartoForm
                animalId={animalId}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            )}
            {tipoEvento === 'secagem' && (
              <SecagemForm
                animalId={animalId}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            )}
            {tipoEvento === 'aborto' && (
              <AbortoForm
                animalId={animalId}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            )}
            {tipoEvento === 'descarte' && (
              <DescarteForm
                animalId={animalId}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
