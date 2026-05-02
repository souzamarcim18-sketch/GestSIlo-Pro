'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarEventoVendaSchema, type CriarEventoVendaInput } from '@/lib/validations/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
import type { Animal } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

interface VendaFormProps {
  animal: Animal;
  onSuccess: () => void;
}

export function VendaForm({ animal, onSuccess }: VendaFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriarEventoVendaInput>({
    resolver: zodResolver(criarEventoVendaSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: TipoEvento.VENDA,
      data_evento: new Date().toISOString().split('T')[0],
      comprador: null,
      valor_venda: undefined,
      observacoes: null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await registrarEventoAction(data);
      if (result.success) {
        toast.success('Venda registrada com sucesso');
        reset();
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar venda');
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
        <Label htmlFor="venda-data">Data do Evento *</Label>
        <Input
          id="venda-data"
          type="date"
          {...register('data_evento')}
          disabled={isLoading}
        />
        {errors.data_evento && (
          <p className="text-sm text-red-600">{errors.data_evento.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="venda-comprador">Comprador</Label>
        <Input
          id="venda-comprador"
          placeholder="Nome do comprador"
          {...register('comprador')}
          disabled={isLoading}
        />
        {errors.comprador && (
          <p className="text-sm text-red-600">{errors.comprador.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="venda-preco">Preço (R$)</Label>
        <Input
          id="venda-preco"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('valor_venda', { valueAsNumber: true })}
          disabled={isLoading}
        />
        {errors.valor_venda && (
          <p className="text-sm text-red-600">{errors.valor_venda.message}</p>
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
            'Registrar Venda'
          )}
        </Button>
      </div>
    </form>
  );
}
