'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { criarEventoTransferenciaSchema, type CriarEventoTransferenciaInput } from '@/lib/validations/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
import type { Animal, Lote } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

interface TransferenciaLoteFormProps {
  animal: Animal;
  lotes: Lote[];
  onSuccess: () => void;
}

export function TransferenciaLoteForm({
  animal,
  lotes,
  onSuccess,
}: TransferenciaLoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarEventoTransferenciaInput>({
    resolver: zodResolver(criarEventoTransferenciaSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: TipoEvento.TRANSFERENCIA_LOTE,
      data_evento: new Date().toISOString().split('T')[0],
      lote_id_destino: '',
      observacoes: null,
    },
  });

  const loteValue = watch('lote_id_destino');

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await registrarEventoAction(data);
      if (result.success) {
        toast.success('Transferência registrada com sucesso');
        reset();
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar transferência');
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
        <Label htmlFor="trans-data">Data do Evento *</Label>
        <Input
          id="trans-data"
          type="date"
          {...register('data_evento')}
          disabled={isLoading}
        />
        {errors.data_evento && (
          <p className="text-sm text-red-600">{errors.data_evento.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="trans-lote">Lote Destino *</Label>
        <Select
          value={String(loteValue || '')}
          onValueChange={(v) => setValue('lote_id_destino', v as string)}
          disabled={isLoading}
        >
          <SelectTrigger id="trans-lote">
            <SelectValue placeholder="Selecionar lote" />
          </SelectTrigger>
          <SelectContent>
            {lotes.map((lote) => (
              <SelectItem key={lote.id} value={lote.id}>
                {lote.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.lote_id_destino && (
          <p className="text-sm text-red-600">{errors.lote_id_destino.message}</p>
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
            'Registrar Transferência'
          )}
        </Button>
      </div>
    </form>
  );
}
