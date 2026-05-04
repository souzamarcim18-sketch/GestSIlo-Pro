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
import { criarDescarteSchema, type CriarDescarteInput } from '@/lib/validations/rebanho-reproducao';
import { lancarDescarteAction } from '@/app/dashboard/rebanho/reproducao/actions';
import type { Animal } from '@/lib/types/rebanho';

interface DescarteFormDialogProps {
  animal: Animal;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const motivosMap = {
  infertilidade: 'Infertilidade',
  mastite_cronica: 'Mastite Crônica',
  idade: 'Idade',
  problema_cascos: 'Problema nos Cascos',
  comportamento_agressivo: 'Comportamento Agressivo',
  outro: 'Outro',
};

export function DescarteFormDialog({
  animal,
  isOpen,
  onOpenChange,
  onSuccess,
}: DescarteFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarDescarteInput>({
    resolver: zodResolver(criarDescarteSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: 'descarte',
      data_evento: new Date().toISOString().split('T')[0],
      motivo: 'infertilidade',
      observacoes: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await lancarDescarteAction(data);
      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }
      toast.success('Descarte registrado com sucesso');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar descarte');
    } finally {
      setIsLoading(false);
    }
  });

  const motivoValue = watch('motivo');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Descarte</DialogTitle>
          <DialogDescription>
            Animal: <strong>{animal.brinco}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_evento">Data do Descarte *</Label>
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
            <Label htmlFor="motivo">Motivo do Descarte *</Label>
            <Select
              value={motivoValue}
              onValueChange={(v) => setValue('motivo', v as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="motivo" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(motivosMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.motivo && (
              <p className="text-sm text-red-600">{errors.motivo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o descarte..."
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
                'Registrar Descarte'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
