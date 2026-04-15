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
import { TIPOS_SOLO } from '../../helpers';
import { type Talhao } from '@/lib/types/talhoes';

const talhoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  area_ha: z.number().min(0.1, 'Área deve ser maior que 0'),
  tipo_solo: z.string().optional(),
  observacoes: z.string().optional(),
});

type TalhaoInput = z.infer<typeof talhoSchema>;

interface TalhaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  talhao?: Talhao;
  onSuccess?: () => void;
}

export function TalhaoForm({
  open,
  onOpenChange,
  mode,
  talhao,
  onSuccess,
}: TalhaoFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TalhaoInput>({
    resolver: zodResolver(talhoSchema),
    defaultValues: talhao
      ? {
          nome: talhao.nome,
          area_ha: talhao.area_ha,
          tipo_solo: talhao.tipo_solo || '',
          observacoes: talhao.observacoes || '',
        }
      : undefined,
  });

  const tipoSolo = watch('tipo_solo');

  const onSubmit = async (data: TalhaoInput) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await q.talhoes.create({
          nome: data.nome,
          area_ha: data.area_ha,
          tipo_solo: data.tipo_solo || null,
          observacoes: data.observacoes || null,
          status: 'Em pousio',
        } as any);
        toast.success('Talhão cadastrado com sucesso!');
      } else if (talhao) {
        await q.talhoes.update(talhao.id, {
          nome: data.nome,
          area_ha: data.area_ha,
          tipo_solo: data.tipo_solo,
          observacoes: data.observacoes,
        } as any);
        toast.success('Talhão atualizado com sucesso!');
      }
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar talhão:', error);
      toast.error('Erro ao salvar talhão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Cadastrar Novo Talhão' : 'Editar Talhão'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Adicione uma nova área de produção.'
              : 'Atualize os dados do talhão.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Talhão</Label>
            <Input
              id="nome"
              placeholder="Ex: Talhão A"
              {...register('nome')}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area_ha">Área (ha)</Label>
              <Input
                id="area_ha"
                type="number"
                step="0.01"
                placeholder="Ex: 10"
                {...register('area_ha', { valueAsNumber: true })}
              />
              {errors.area_ha && (
                <p className="text-sm text-destructive">{errors.area_ha.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_solo">Tipo de Solo</Label>
              <Select value={tipoSolo || ''} onValueChange={(v) => setValue('tipo_solo', v as any)}>
                <SelectTrigger id="tipo_solo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SOLO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              placeholder="Informações adicionais..."
              {...register('observacoes')}
            />
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
              {isLoading ? 'Salvando...' : mode === 'create' ? 'Cadastrar' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
