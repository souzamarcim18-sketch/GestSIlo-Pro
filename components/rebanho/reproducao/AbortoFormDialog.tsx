'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarAbortoSchema, type CriarAbortoInput } from '@/lib/validations/rebanho-reproducao';
import { lancarAbortoAction } from '@/app/dashboard/rebanho/reproducao/actions';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { enqueue } from '@/lib/db/syncQueue';
import { getDb } from '@/lib/db/localDb';
import type { Animal } from '@/lib/types/rebanho';
import type { EventoReprodutivoLocal } from '@/lib/db/eventosRebanho';

interface AbortoFormDialogProps {
  animal: Animal;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AbortoFormDialog({
  animal,
  isOpen,
  onOpenChange,
  onSuccess,
}: AbortoFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isOnline = useOnlineStatus();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriarAbortoInput>({
    resolver: zodResolver(criarAbortoSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: 'aborto',
      data_evento: new Date().toISOString().split('T')[0],
      idade_gestacional_dias: undefined,
      causa_aborto: '',
      observacoes: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      if (isOnline) {
        const result = await lancarAbortoAction(data);
        if (!result.success) {
          throw new Error(result.erro || 'Erro desconhecido');
        }
        toast.success('Aborto registrado com sucesso');
      } else {
        const db = await getDb();
        if (!db) throw new Error('Armazenamento local não disponível');

        const eventoId = crypto.randomUUID();
        const evento: EventoReprodutivoLocal = {
          id: eventoId,
          animal_id: data.animal_id,
          tipo_evento: 'aborto',
          data_evento: data.data_evento,
          payload: data,
          _sync_status: 'pending',
          _created_at: Date.now(),
        };
        await db.put('eventos_rebanho', evento);

        await enqueue('eventos_rebanho', 'INSERT', {
          id: eventoId,
          ...data,
        });

        toast.success('Aborto salvo localmente — será sincronizado quando houver conexão', {
          icon: '📵',
        });
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar aborto');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Aborto</DialogTitle>
          <DialogDescription>
            Animal: <strong>{animal.brinco}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_evento">Data do Aborto *</Label>
            <Input
              id="data_evento"
              type="date"
              {...register('data_evento')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.data_evento && (
              <p className="text-sm text-red-600">{errors.data_evento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="idade_gestacional">Idade Gestacional (dias)</Label>
            <Input
              id="idade_gestacional"
              type="number"
              min={0}
              max={300}
              placeholder="0-300"
              {...register('idade_gestacional_dias', {
                setValueAs: (v) => v === '' ? undefined : Number(v),
              })}
              disabled={isLoading}
              className="h-12"
            />
            {errors.idade_gestacional_dias && (
              <p className="text-sm text-red-600">{errors.idade_gestacional_dias.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="causa_aborto">Causa do Aborto</Label>
            <Textarea
              id="causa_aborto"
              placeholder="Descrição da causa do aborto..."
              {...register('causa_aborto')}
              disabled={isLoading}
              className="min-h-20 resize-none"
            />
            {errors.causa_aborto && (
              <p className="text-sm text-red-600">{errors.causa_aborto.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações adicionais..."
              {...register('observacoes')}
              disabled={isLoading}
              className="min-h-20 resize-none"
            />
            {errors.observacoes && (
              <p className="text-sm text-red-600">{errors.observacoes.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Aborto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
