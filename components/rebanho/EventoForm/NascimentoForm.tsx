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
import { criarEventoNascimentoSchema, type CriarEventoNascimentoInput } from '@/lib/validations/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
import type { Animal } from '@/lib/types/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

interface NascimentoFormProps {
  animal: Animal;
  animais: Animal[];
  onSuccess: () => void;
}

export function NascimentoForm({ animal, animais, onSuccess }: NascimentoFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarEventoNascimentoInput>({
    resolver: zodResolver(criarEventoNascimentoSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: TipoEvento.NASCIMENTO,
      data_evento: new Date().toISOString().split('T')[0],
      observacoes: null,
    },
  });

  const animaisFemea = animais.filter((a) => a.sexo === 'Fêmea' && a.status === 'Ativo');
  const animaisMacho = animais.filter((a) => a.sexo === 'Macho' && a.status === 'Ativo');

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await registrarEventoAction(data);
      if (result.success) {
        toast.success('Nascimento registrado com sucesso');
        reset();
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar nascimento');
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
        <Label htmlFor="nasc-data">Data do Evento *</Label>
        <Input
          id="nasc-data"
          type="date"
          {...register('data_evento')}
          disabled={isLoading}
        />
        {errors.data_evento && (
          <p className="text-sm text-red-600">{errors.data_evento.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nasc-mae">Mãe</Label>
        <Select
          value={watch('observacoes') || ''}
          onValueChange={(v) => {
            // Usando observacoes temporariamente para carregar mae_id
            // Na implementação real, adicionar campo mae_id no form
          }}
          disabled={isLoading}
        >
          <SelectTrigger id="nasc-mae">
            <SelectValue placeholder="Selecionar mãe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sem mãe</SelectItem>
            {animaisFemea.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.brinco}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nasc-pai">Pai</Label>
        <Select disabled={isLoading}>
          <SelectTrigger id="nasc-pai">
            <SelectValue placeholder="Selecionar pai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sem pai</SelectItem>
            {animaisMacho.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.brinco}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Nascimento'
          )}
        </Button>
      </div>
    </form>
  );
}
