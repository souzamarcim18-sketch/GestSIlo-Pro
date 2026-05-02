'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarEventoPesagemSchema, type CriarEventoPesagemInput } from '@/lib/validations/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
import type { Animal } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

interface PesagemFormProps {
  animal: Animal;
  onSuccess: () => void;
}

export function PesagemForm({ animal, onSuccess }: PesagemFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriarEventoPesagemInput>({
    resolver: zodResolver(criarEventoPesagemSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: TipoEvento.PESAGEM,
      data_evento: new Date().toISOString().split('T')[0],
      peso_kg: undefined,
      observacoes: null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await registrarEventoAction(data);
      if (result.success) {
        toast.success('Pesagem registrada com sucesso');
        reset();
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar pesagem');
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
        <Label htmlFor="pesagem-data">Data do Evento *</Label>
        <Input
          id="pesagem-data"
          type="date"
          {...register('data_evento')}
          disabled={isLoading}
        />
        {errors.data_evento && (
          <p className="text-sm text-red-600">{errors.data_evento.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pesagem-peso">Peso (kg) *</Label>
        <Input
          id="pesagem-peso"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('peso_kg', { valueAsNumber: true })}
          disabled={isLoading}
        />
        {errors.peso_kg && (
          <p className="text-sm text-red-600">{errors.peso_kg.message}</p>
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
            'Registrar Pesagem'
          )}
        </Button>
      </div>
    </form>
  );
}
