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
import { criarReprodutorSchema, type CriarReprodutorInput } from '@/lib/validations/rebanho-reproducao';
import { criarReprodutorAction, editarReprodutorAction } from '@/app/dashboard/rebanho/reproducao/actions';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';

interface ReprodutorFormDialogProps {
  reprodutor?: Reprodutor;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const tiposMap = {
  touro: 'Touro',
  semen_ia: 'Sêmen IA',
  touro_teste: 'Touro Teste',
};

export function ReprodutorFormDialog({
  reprodutor,
  isOpen,
  onOpenChange,
  onSuccess,
}: ReprodutorFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarReprodutorInput>({
    resolver: zodResolver(criarReprodutorSchema),
    defaultValues: reprodutor
      ? {
          nome: reprodutor.nome,
          tipo: reprodutor.tipo as any,
          raca: reprodutor.raca,
          numero_registro: reprodutor.numero_registro,
          data_entrada: reprodutor.data_entrada,
          observacoes: reprodutor.observacoes,
        }
      : {
          nome: '',
          tipo: 'touro',
          raca: '',
          numero_registro: '',
          data_entrada: new Date().toISOString().split('T')[0],
          observacoes: '',
        },
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = reprodutor
        ? await editarReprodutorAction(reprodutor.id, data)
        : await criarReprodutorAction(data);

      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }

      const message = reprodutor ? 'Reprodutor atualizado com sucesso' : 'Reprodutor criado com sucesso';
      toast.success(message);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar reprodutor');
    } finally {
      setIsLoading(false);
    }
  });

  const tipoValue = watch('tipo');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reprodutor ? 'Editar Reprodutor' : 'Novo Reprodutor'}</DialogTitle>
          <DialogDescription>
            {reprodutor ? 'Atualize os dados do reprodutor' : 'Cadastre um novo reprodutor na fazenda'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Nome do reprodutor..."
              {...register('nome')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select
              value={tipoValue}
              onValueChange={(v) => setValue('tipo', v as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="tipo" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tiposMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-red-600">{errors.tipo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="raca">Raça</Label>
            <Input
              id="raca"
              placeholder="Ex: Holandês, Girolando..."
              {...register('raca')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.raca && (
              <p className="text-sm text-red-600">{errors.raca.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_registro">Número de Registro</Label>
            <Input
              id="numero_registro"
              placeholder="Ex: ABCxxxx..."
              {...register('numero_registro')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.numero_registro && (
              <p className="text-sm text-red-600">{errors.numero_registro.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_entrada">Data de Entrada</Label>
            <Input
              id="data_entrada"
              type="date"
              {...register('data_entrada')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.data_entrada && (
              <p className="text-sm text-red-600">{errors.data_entrada.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o reprodutor..."
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
                  Salvando...
                </>
              ) : (
                reprodutor ? 'Atualizar' : 'Criar Reprodutor'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
