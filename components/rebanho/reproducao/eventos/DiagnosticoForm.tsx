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
import { lancarDiagnosticoAction } from '@/app/dashboard/rebanho/reproducao/actions';
import { criarDiagnosticoSchema, type CriarDiagnosticoInput } from '@/lib/validations/rebanho-reproducao';
import { Loader2, ArrowLeft } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface DiagnosticoFormProps {
  animalId?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function DiagnosticoForm({ animalId, onSuccess, onBack }: DiagnosticoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CriarDiagnosticoInput>({
    resolver: zodResolver(criarDiagnosticoSchema),
    defaultValues: {
      animal_id: animalId || '',
      tipo: 'diagnostico_prenhez',
      data_evento: new Date().toISOString().split('T')[0],
      metodo_diagnostico: 'ultrassom',
      resultado_prenhez: 'negativo',
    },
  });

  const resultado = watch('resultado_prenhez');
  const idadeGestacional = watch('idade_gestacional_dias');

  // Calcular data prevista de parto se for positivo
  const dataPartoEstimada = resultado === 'positivo' && idadeGestacional
    ? format(addDays(new Date(), 280 - idadeGestacional), 'dd/MM/yyyy')
    : null;

  async function onSubmit(data: CriarDiagnosticoInput) {
    setIsLoading(true);
    try {
      const resultado = await lancarDiagnosticoAction(data);
      if (resultado.success) {
        toast.success('Diagnóstico registrado com sucesso');
        onSuccess();
      } else {
        toast.error(resultado.erro || 'Erro ao registrar diagnóstico');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar diagnóstico');
    } finally {
      setIsLoading(false);
    }
  }

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
          <Label htmlFor="metodo_diagnostico">Método *</Label>
          <Controller
            control={control}
            name="metodo_diagnostico"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultrassom">Ultrassom</SelectItem>
                  <SelectItem value="palpacao">Palpação Retal</SelectItem>
                  <SelectItem value="sangue">Sangue</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.metodo_diagnostico && (
            <p className="text-sm text-red-500">{errors.metodo_diagnostico.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Resultado *</Label>
        <Controller
          control={control}
          name="resultado_prenhez"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positivo">Positiva</SelectItem>
                <SelectItem value="negativo">Negativa</SelectItem>
                <SelectItem value="duvidoso">Inconclusiva</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.resultado_prenhez && (
          <p className="text-sm text-red-500">{errors.resultado_prenhez.message}</p>
        )}
      </div>

      {resultado === 'positivo' && (
        <div className="space-y-2">
          <Label htmlFor="idade_gestacional_dias">Dias de Gestação</Label>
          <Controller
            control={control}
            name="idade_gestacional_dias"
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                {...field}
                type="number"
                placeholder="Ex: 60"
                disabled={isLoading}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
              />
            )}
          />
          {idadeGestacional && (
            <p className="text-sm text-green-600">
              Parto previsto em: <strong>{dataPartoEstimada}</strong>
            </p>
          )}
        </div>
      )}

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
