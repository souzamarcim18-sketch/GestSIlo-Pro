'use client';

import { useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { lancarPartoAction } from '@/app/dashboard/rebanho/reproducao/actions';
import { criarPartoSchema, type CriarPartoInput } from '@/lib/validations/rebanho-reproducao';
import { Loader2, ArrowLeft, Trash2, Plus } from 'lucide-react';

interface PartoFormProps {
  animalId?: string;
  onSuccess: (eventoId?: string) => void;
  onBack: () => void;
}

export function PartoForm({ animalId, onSuccess, onBack }: PartoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CriarPartoInput>({
    resolver: zodResolver(criarPartoSchema),
    defaultValues: {
      animal_id: animalId || '',
      tipo: 'parto',
      data_evento: new Date().toISOString().split('T')[0],
      tipo_parto: 'normal',
      gemelar: false,
      natimorto: false,
      crias: [{ sexo: 'Fêmea', vivo: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'crias',
  });

  const gemelar = watch('gemelar');
  const crias = watch('crias');

  // Validar número de crias
  const numCriasValido = (gemelar && crias.length === 2) || (!gemelar && crias.length === 1);

  async function onSubmit(data: CriarPartoInput) {
    setIsLoading(true);
    try {
      const resultado = await lancarPartoAction(data);
      if (resultado.success) {
        toast.success(`Parto registrado com sucesso (${resultado.bezerros_criados} bezerro(s) criado(s))`);
        onSuccess(resultado.evento_id);
      } else {
        toast.error(resultado.erro || 'Erro ao registrar parto');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar parto');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="animal_id">Animal (Mãe) *</Label>
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
          <Label htmlFor="tipo_parto">Tipo de Parto *</Label>
          <Controller
            control={control}
            name="tipo_parto"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="distocico">Assistido/Distócico</SelectItem>
                  <SelectItem value="cesariana">Cesariana</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.tipo_parto && (
            <p className="text-sm text-red-500">{errors.tipo_parto.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="gemelar"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              )}
            />
            <Label htmlFor="gemelar" className="font-normal">Parto Gemelar</Label>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="natimorto"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              )}
            />
            <Label htmlFor="natimorto" className="font-normal">Incluir Natimorto</Label>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex justify-between items-center">
          <Label>Crias *</Label>
          {!gemelar && fields.length < 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ sexo: 'Fêmea', vivo: true })}
              disabled={isLoading}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Cria
            </Button>
          )}
          {gemelar && fields.length < 2 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ sexo: 'Fêmea', vivo: true })}
              disabled={isLoading}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Cria
            </Button>
          )}
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="space-y-3 border rounded-lg p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Cria {index + 1}</Label>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`crias.${index}.sexo`}>Sexo *</Label>
                <Controller
                  control={control}
                  name={`crias.${index}.sexo`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Fêmea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`crias.${index}.peso_kg`}>Peso (kg)</Label>
                <Controller
                  control={control}
                  name={`crias.${index}.peso_kg`}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      {...field}
                      type="number"
                      placeholder="Ex: 45"
                      disabled={isLoading}
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      step="0.1"
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name={`crias.${index}.vivo`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                )}
              />
              <Label htmlFor={`crias.${index}.vivo`} className="font-normal">
                Nasceu Vivo
              </Label>
            </div>
          </div>
        ))}

        {errors.crias && (
          <p className="text-sm text-red-500">{errors.crias.message}</p>
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
          disabled={isLoading || !numCriasValido}
          className="gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar
        </Button>
      </div>
    </form>
  );
}
