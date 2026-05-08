'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { lancarDescarteAction } from '@/app/dashboard/rebanho/reproducao/actions';
import { criarDescarteSchema, type CriarDescarteInput } from '@/lib/validations/rebanho-reproducao';
import { Loader2, ArrowLeft } from 'lucide-react';

interface DescarteFormProps {
  animalId?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function DescarteForm({ animalId, onSuccess, onBack }: DescarteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CriarDescarteInput>({
    resolver: zodResolver(criarDescarteSchema),
    defaultValues: {
      animal_id: animalId || '',
      tipo: 'descarte',
      data_evento: new Date().toISOString().split('T')[0],
      motivo_descarte: 'outro',
    },
  });

  async function onSubmit(data: CriarDescarteInput) {
    setIsLoading(true);
    try {
      const resultado = await lancarDescarteAction(data);
      if (resultado.success) {
        toast.success('Descarte registrado com sucesso');
        onSuccess();
      } else {
        toast.error(resultado.erro || 'Erro ao registrar descarte');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar descarte');
    } finally {
      setIsLoading(false);
    }
  }

  const motivosDescarte = [
    { value: 'idade', label: 'Idade' },
    { value: 'reprodutivo', label: 'Problemas Reprodutivos' },
    { value: 'sanitario', label: 'Problemas Sanitários' },
    { value: 'producao', label: 'Baixa Produção' },
    { value: 'aprumos', label: 'Problemas de Aprumos' },
    { value: 'outro', label: 'Outro' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="animal_id">Animal *</Label>
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
          <Label htmlFor="motivo_descarte">Motivo *</Label>
          <Controller
            control={control}
            name="motivo_descarte"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {motivosDescarte.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.motivo_descarte && (
            <p className="text-sm text-red-500">{errors.motivo_descarte.message}</p>
          )}
        </div>
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
