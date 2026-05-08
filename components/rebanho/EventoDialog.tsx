'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/AuthProvider';
import type { Animal, Lote } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';
import { NascimentoForm } from './EventoForm/NascimentoForm';
import { PesagemForm } from './EventoForm/PesagemForm';
import { MorteForm } from './EventoForm/MorteForm';
import { VendaForm } from './EventoForm/VendaForm';
import { TransferenciaLoteForm } from './EventoForm/TransferenciaLoteForm';

interface EventoDialogProps {
  animal: Animal;
  animais: Animal[];
  lotes: Lote[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EventoDialog({
  animal,
  animais,
  lotes,
  isOpen,
  onOpenChange,
  onSuccess,
}: EventoDialogProps) {
  const { profile } = useAuth();
  const [tipoEvento, setTipoEvento] = useState<TipoEvento | ''>('');

  const isAdmin = profile?.perfil === 'Administrador';

  const eventosDisponiveis = useMemo(() => {
    const todos = [
      { valor: TipoEvento.NASCIMENTO, label: 'Nascimento' },
      { valor: TipoEvento.PESAGEM, label: 'Pesagem' },
      { valor: TipoEvento.TRANSFERENCIA_LOTE, label: 'Transferência de Lote' },
    ];

    if (isAdmin) {
      todos.push(
        { valor: TipoEvento.MORTE, label: 'Morte' },
        { valor: TipoEvento.VENDA, label: 'Venda' }
      );
    }

    return todos;
  }, [isAdmin]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTipoEvento('');
    }
    onOpenChange(open);
  };

  const handleSuccess = () => {
    setTipoEvento('');
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Evento</DialogTitle>
          <DialogDescription>
            Animal: <strong>{animal.brinco}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo-evento">Tipo de Evento *</Label>
            <Select
              value={String(tipoEvento)}
              onValueChange={(v) => setTipoEvento(v as TipoEvento | '')}
            >
              <SelectTrigger id="tipo-evento">
                <SelectValue placeholder="Selecionar tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                {eventosDisponiveis.map((evt) => (
                  <SelectItem key={evt.valor} value={evt.valor}>
                    {evt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoEvento === TipoEvento.NASCIMENTO && (
            <NascimentoForm
              animal={animal}
              animais={animais}
              onSuccess={handleSuccess}
            />
          )}

          {tipoEvento === TipoEvento.PESAGEM && (
            <PesagemForm animal={animal} onSuccess={handleSuccess} />
          )}

          {tipoEvento === TipoEvento.MORTE && isAdmin && (
            <MorteForm animal={animal} onSuccess={handleSuccess} />
          )}

          {tipoEvento === TipoEvento.VENDA && isAdmin && (
            <VendaForm animal={animal} onSuccess={handleSuccess} />
          )}

          {tipoEvento === TipoEvento.TRANSFERENCIA_LOTE && (
            <TransferenciaLoteForm
              animal={animal}
              lotes={lotes}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
