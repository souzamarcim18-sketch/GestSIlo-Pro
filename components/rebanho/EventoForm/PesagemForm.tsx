'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    control,
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
      metodo: 'balanca',
      condicao_corporal: null,
      observacoes: null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await registrarEventoAction(data.animal_id, data);
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
        <Label htmlFor="pesagem-data" className="text-sm font-semibold">Data do Evento *</Label>
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
        <Label htmlFor="pesagem-peso" className="text-sm font-semibold">Peso (kg) *</Label>
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

      <div className="space-y-2">
        <Label htmlFor="pesagem-metodo" className="text-sm font-semibold">Método de Pesagem *</Label>
        <Controller
          name="metodo"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pesagem-metodo" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanca">Balança</SelectItem>
                <SelectItem value="estimativa_visual">Estimativa Visual</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.metodo && (
          <p className="text-sm text-red-600">{errors.metodo.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pesagem-cc" className="text-sm font-semibold">Condição Corporal (1-5)</Label>
        <Controller
          name="condicao_corporal"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ''}
              onValueChange={(val) => field.onChange(val ? Number(val) : null)}
            >
              <SelectTrigger id="pesagem-cc" disabled={isLoading}>
                <SelectValue placeholder="Não avaliar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não avaliar</SelectItem>
                <SelectItem value="1">1 - Muito magro</SelectItem>
                <SelectItem value="2">2 - Magro</SelectItem>
                <SelectItem value="3">3 - Ideal</SelectItem>
                <SelectItem value="4">4 - Gordo</SelectItem>
                <SelectItem value="5">5 - Obeso</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.condicao_corporal && (
          <p className="text-sm text-red-600">{errors.condicao_corporal.message}</p>
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
