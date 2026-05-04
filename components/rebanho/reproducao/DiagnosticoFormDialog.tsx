'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarDiagnosticoSchema, type CriarDiagnosticoInput } from '@/lib/validations/rebanho-reproducao';
import { lancarDiagnosticoAction } from '@/app/dashboard/rebanho/reproducao/actions';
import type { Animal } from '@/lib/types/rebanho';

interface DiagnosticoFormDialogProps {
  animal: Animal;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Bate com MetodoDiagnosticoEnum (banco: eventos_rebanho.metodo_diagnostico)
const metodosMap = {
  palpacao: 'Palpação',
  ultrassom: 'Ultrassom',
  sangue: 'Dosagem de Sangue',
};

// Bate com ResultadoDiagnosticoEnum (banco: eventos_rebanho.resultado_prenhez)
const resultadosMap = {
  positivo: 'Positivo',
  negativo: 'Negativo',
  duvidoso: 'Duvidoso',
};

export function DiagnosticoFormDialog({
  animal,
  isOpen,
  onOpenChange,
  onSuccess,
}: DiagnosticoFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarDiagnosticoInput>({
    resolver: zodResolver(criarDiagnosticoSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: 'diagnostico_prenhez',
      data_evento: new Date().toISOString().split('T')[0],
      metodo_diagnostico: 'palpacao',
      resultado_prenhez: 'positivo',
      idade_gestacional_dias: undefined,
      observacoes: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await lancarDiagnosticoAction(data);
      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }
      toast.success('Diagnóstico registrado com sucesso');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar diagnóstico');
    } finally {
      setIsLoading(false);
    }
  });

  const metodoValue = watch('metodo_diagnostico');
  const resultadoValue = watch('resultado_prenhez');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Diagnóstico</DialogTitle>
          <DialogDescription>
            Animal: <strong>{animal.brinco}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_evento">Data do Evento *</Label>
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
            <Label htmlFor="metodo_diagnostico">Método *</Label>
            <Select
              value={metodoValue}
              onValueChange={(v) => setValue('metodo_diagnostico', v as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="metodo_diagnostico" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(metodosMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.metodo_diagnostico && (
              <p className="text-sm text-red-600">{errors.metodo_diagnostico.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resultado_prenhez">Resultado *</Label>
            <Select
              value={resultadoValue}
              onValueChange={(v) => setValue('resultado_prenhez', v as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="resultado_prenhez" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(resultadosMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.resultado_prenhez && (
              <p className="text-sm text-red-600">{errors.resultado_prenhez.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="idade_gestacional">Idade Gestacional (dias)</Label>
            <Input
              id="idade_gestacional"
              type="number"
              min={0}
              max={300}
              placeholder="0-300"
              {...register('idade_gestacional_dias', {
                setValueAs: (v) => v === '' ? undefined : Number(v),
              })}
              disabled={isLoading}
              className="h-12"
            />
            {errors.idade_gestacional_dias && (
              <p className="text-sm text-red-600">{errors.idade_gestacional_dias.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o diagnóstico..."
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
                'Registrar Diagnóstico'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
