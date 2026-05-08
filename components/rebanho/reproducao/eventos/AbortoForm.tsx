'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { lancarAbortoAction } from '@/app/dashboard/rebanho/reproducao/actions';
import { criarAbortoSchema, type CriarAbortoInput } from '@/lib/validations/rebanho-reproducao';
import { Loader2, ArrowLeft } from 'lucide-react';

interface AbortoFormProps {
  animalId?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function AbortoForm({ animalId, onSuccess, onBack }: AbortoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CriarAbortoInput>({
    resolver: zodResolver(criarAbortoSchema),
    defaultValues: {
      animal_id: animalId || '',
      tipo: 'aborto',
      data_evento: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(data: CriarAbortoInput) {
    setIsLoading(true);
    try {
      const resultado = await lancarAbortoAction(data);
      if (resultado.success) {
        toast.success('Aborto/Perda registrado com sucesso');
        onSuccess();
      } else {
        toast.error(resultado.erro || 'Erro ao registrar aborto');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar aborto');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="animal_id">Animal (Fêmea Prenha) *</Label>
        <Controller
          control={control}
          name="animal_id"
          render={({ field }) => (
            <Input
              {...field}
              placeholder="ID do animal"
              disabled={!!animalId || isLoading}
            />
          )}
        />
        {errors.animal_id && (
          <p className="text-sm text-red-500">{errors.animal_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_evento">Data *</Label>
          <Controller
            control={control}
            name="data_evento"
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                disabled={isLoading}
              />
            )}
          />
          {errors.data_evento && (
            <p className="text-sm text-red-500">{errors.data_evento.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="idade_gestacional_dias">Dias de Gestação</Label>
          <Controller
            control={control}
            name="idade_gestacional_dias"
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                {...field}
                type="number"
                placeholder="Ex: 120"
                disabled={isLoading}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="causa_aborto">Causa</Label>
        <Controller
          control={control}
          name="causa_aborto"
          render={({ field: { value, ...field } }) => (
            <Input
              {...field}
              placeholder="Ex: Infecção, Stress, Deficiência nutricional..."
              disabled={isLoading}
              value={value ?? ''}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Controller
          control={control}
          name="observacoes"
          render={({ field: { value, ...field } }) => (
            <Textarea
              {...field}
              placeholder="Observações adicionais..."
              disabled={isLoading}
              value={value ?? ''}
              rows={3}
            />
          )}
        />
      </div>

      <div className="flex gap-2 justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar
        </Button>
      </div>
    </form>
  );
}
