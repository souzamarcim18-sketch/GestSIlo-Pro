'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarEventoMorteSchema, type CriarEventoMorteInput } from '@/lib/validations/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
import type { Animal } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

interface MorteFormProps {
  animal: Animal;
  onSuccess: () => void;
}

export function MorteForm({ animal, onSuccess }: MorteFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriarEventoMorteInput>({
    resolver: zodResolver(criarEventoMorteSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: TipoEvento.MORTE,
      data_evento: new Date().toISOString().split('T')[0],
      observacoes: null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await registrarEventoAction(data);
      if (result.success) {
        toast.success('Morte registrada com sucesso');
        reset();
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar morte');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="morte-data">Data do Evento *</Label>
        <Input
          id="morte-data"
          type="date"
          {...register('data_evento')}
          disabled={isLoading}
        />
        {errors.data_evento && (
          <p className="text-sm text-red-600">{errors.data_evento.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="morte-motivo">Motivo/Observações</Label>
        <Textarea
          id="morte-motivo"
          placeholder="Causa da morte, observações relevantes..."
          {...register('observacoes')}
          disabled={isLoading}
          className="min-h-20"
        />
        {errors.observacoes && (
          <p className="text-sm text-red-600">{errors.observacoes.message}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Morte'
          )}
        </Button>
      </div>
    </form>
  );
}
