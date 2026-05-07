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
import { lancarCoberturaAction } from '@/app/dashboard/rebanho/reproducao/actions';
import { criarCoberturaSchema, type CriarCoberturaInput } from '@/lib/validations/rebanho-reproducao';
import { useReprodutores } from '@/lib/hooks/useReprodutores';
import { Loader2, ArrowLeft } from 'lucide-react';

interface CoberturaFormProps {
  animalId?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function CoberturaForm({ animalId, onSuccess, onBack }: CoberturaFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { reprodutores, isLoading: isLoadingReprodutores } = useReprodutores();
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CriarCoberturaInput>({
    resolver: zodResolver(criarCoberturaSchema),
    defaultValues: {
      animal_id: animalId || '',
      tipo: 'cobertura',
      data_evento: new Date().toISOString().split('T')[0],
      tipo_cobertura: 'monta_natural',
      reprodutor_id: '',
    },
  });

  const tipo_cobertura = watch('tipo_cobertura');

  async function onSubmit(data: CriarCoberturaInput) {
    setIsLoading(true);
    try {
      const resultado = await lancarCoberturaAction(data);
      if (resultado.success) {
        toast.success('Cobertura registrada com sucesso');
        onSuccess();
      } else {
        toast.error(resultado.erro || 'Erro ao registrar cobertura');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar cobertura');
    } finally {
      setIsLoading(false);
    }
  }

  const tiposCoberturaLabels: Record<string, string> = {
    monta_natural: 'Monta Natural',
    ia_convencional: 'Inseminação Artificial (IA)',
    iatf: 'IATF',
    tetf: 'TETF',
    fiv: 'FIV',
    repasse: 'Repasse',
  };

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
          <Label htmlFor="tipo_cobertura">Tipo de Cobertura *</Label>
          <Controller
            control={control}
            name="tipo_cobertura"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tiposCoberturaLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value as any}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.tipo_cobertura && (
            <p className="text-sm text-red-500">{errors.tipo_cobertura.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reprodutor_id">Reprodutor *</Label>
        <Controller
          control={control}
          name="reprodutor_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isLoading || isLoadingReprodutores}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar reprodutor" />
              </SelectTrigger>
              <SelectContent>
                {reprodutores?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome} ({r.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.reprodutor_id && (
          <p className="text-sm text-red-500">{errors.reprodutor_id.message}</p>
        )}
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
