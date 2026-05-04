'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { criarPartoSchema, type CriarPartoInput } from '@/lib/validations/rebanho-reproducao';
import type { Animal } from '@/lib/types/rebanho';

interface PartoFormDialogProps {
  animal: Animal;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const tiposPartoMap = {
  normal: 'Normal',
  distocico: 'Distócico',
  cesariana: 'Cesariana',
};

export function PartoFormDialog({
  animal,
  isOpen,
  onOpenChange,
  onSuccess,
}: PartoFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CriarPartoInput>({
    resolver: zodResolver(criarPartoSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: 'parto',
      data_evento: new Date().toISOString().split('T')[0],
      tipo_parto: 'normal',
      gemelar: false,
      natimorto: false,
      crias: [
        { sexo: 'Fêmea', peso_kg: undefined, vivo: true },
      ],
      observacoes: '',
    } as any,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'crias',
  });

  const gemelar = watch('gemelar');
  const tipoParto = watch('tipo_parto');

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      // TODO: Implementar createPartoAction
      toast.success('Parto registrado com sucesso');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar parto');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Parto</DialogTitle>
          <DialogDescription>
            Animal: <strong>{animal.brinco}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_evento">Data do Parto *</Label>
            <Input
              id="data_evento"
              type="date"
              {...register('data_evento')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.data_evento && (
              <p className="text-sm text-red-600">{errors.data_evento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_parto">Tipo de Parto *</Label>
            <Select
              value={tipoParto}
              onValueChange={(v) => setValue('tipo_parto', v as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="tipo_parto" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tiposPartoMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_parto && (
              <p className="text-sm text-red-600">{errors.tipo_parto.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="gemelar"
                checked={gemelar}
                onCheckedChange={(checked) => setValue('gemelar', checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="gemelar" className="font-normal">
                Gemelar
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="natimorto"
                {...register('natimorto')}
                disabled={isLoading}
              />
              <Label htmlFor="natimorto" className="font-normal">
                Natimorto
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Crias *</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cria {index + 1}</span>
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

                <div className="space-y-2">
                  <Label htmlFor={`cria-sexo-${index}`}>Sexo *</Label>
                  <Select
                    value={watch(`crias.${index}.sexo`)}
                    onValueChange={(v) => setValue(`crias.${index}.sexo`, v as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id={`cria-sexo-${index}`} className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.crias?.[index]?.sexo && (
                    <p className="text-sm text-red-600">{errors.crias[index]?.sexo?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cria-peso-${index}`}>Peso (kg)</Label>
                  <Input
                    id={`cria-peso-${index}`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    {...register(`crias.${index}.peso_kg`, {
                      setValueAs: (v) => v === '' ? undefined : Number(v),
                    })}
                    disabled={isLoading}
                    className="h-12"
                  />
                  {errors.crias?.[index]?.peso_kg && (
                    <p className="text-sm text-red-600">{errors.crias[index]?.peso_kg?.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`cria-vivo-${index}`}
                    checked={watch(`crias.${index}.vivo`)}
                    onCheckedChange={(checked) => setValue(`crias.${index}.vivo`, checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`cria-vivo-${index}`} className="font-normal">
                    Viva
                  </Label>
                </div>
              </div>
            ))}

            {fields.length < 2 && gemelar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ sexo: 'Fêmea', peso_kg: undefined, vivo: true })}
                disabled={isLoading}
                className="w-full h-10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Cria
              </Button>
            )}
            {errors.crias && (
              <p className="text-sm text-red-600">{errors.crias.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o parto..."
              {...register('observacoes')}
              disabled={isLoading}
              className="min-h-20 resize-none"
            />
            {errors.observacoes && (
              <p className="text-sm text-red-600">{errors.observacoes.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Parto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
