'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import { CULTURAS_SUPORTADAS } from '../../helpers';

const cicloSchema = z.object({
  talhao_id: z.string().min(1, 'Talhão é obrigatório'),
  cultura: z.string().min(1, 'Cultura é obrigatória'),
  data_plantio: z.string().min(1, 'Data de plantio é obrigatória'),
  data_colheita_prevista: z.string().min(1, 'Data de colheita é obrigatória'),
});

type CicloInput = z.infer<typeof cicloSchema>;

interface CicloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talhaoId: string;
  onSuccess?: () => void;
}

export function CicloForm({
  open,
  onOpenChange,
  talhaoId,
  onSuccess,
}: CicloFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CicloInput>({
    resolver: zodResolver(cicloSchema),
    defaultValues: {
      talhao_id: talhaoId,
      cultura: '',
      data_plantio: '',
      data_colheita_prevista: '',
    },
  });

  const cultura = watch('cultura');

  const onSubmit = async (data: CicloInput) => {
    setIsLoading(true);
    try {
      await q.ciclosAgricolas.create({
        talhao_id: data.talhao_id,
        cultura: data.cultura,
        data_plantio: data.data_plantio,
        data_colheita_prevista: data.data_colheita_prevista,
        ativo: true,
      } as any);
      toast.success('Ciclo agrícola criado com sucesso!');
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar ciclo:', error);
      toast.error('Erro ao criar ciclo agrícola');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Ciclo Agrícola</DialogTitle>
          <DialogDescription>
            Crie um novo ciclo de plantio neste talhão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cultura">Cultura</Label>
            <Select value={cultura || ''} onValueChange={(v) => setValue('cultura', v as any)}>
              <SelectTrigger id="cultura">
                <SelectValue placeholder="Selecione a cultura" />
              </SelectTrigger>
              <SelectContent>
                {CULTURAS_SUPORTADAS.map((cult) => (
                  <SelectItem key={cult} value={cult}>
                    {cult}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cultura && (
              <p className="text-sm text-destructive">{errors.cultura.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_plantio">Data de Plantio</Label>
            <Input id="data_plantio" type="date" {...register('data_plantio')} />
            {errors.data_plantio && (
              <p className="text-sm text-destructive">
                {errors.data_plantio.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_colheita_prevista">Data de Colheita Prevista</Label>
            <Input
              id="data_colheita_prevista"
              type="date"
              {...register('data_colheita_prevista')}
            />
            {errors.data_colheita_prevista && (
              <p className="text-sm text-destructive">
                {errors.data_colheita_prevista.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Ciclo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
