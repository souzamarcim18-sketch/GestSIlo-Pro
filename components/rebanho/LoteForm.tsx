'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Lote } from '@/lib/types/rebanho';
import {
  criarLoteSchema,
  editarLoteSchema,
  type CriarLoteInput,
  type EditarLoteInput,
} from '@/lib/validations/rebanho';

interface LoteFormProps {
  lote?: Lote;
  onSubmit: (data: CriarLoteInput | EditarLoteInput) => Promise<void>;
  onSuccess?: () => void;
  isLoading?: boolean;
}

export function LoteForm({ lote, onSubmit, onSuccess, isLoading = false }: LoteFormProps) {
  const schema = lote ? editarLoteSchema : criarLoteSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CriarLoteInput | EditarLoteInput>({
    resolver: zodResolver(schema),
    defaultValues: lote
      ? {
          nome: lote.nome,
          descricao: lote.descricao,
        }
      : {
          nome: '',
          descricao: '',
        },
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar lote');
    }
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Lote *</Label>
        <Input
          id="nome"
          placeholder="Ex: Lote A, Bezerros 2024, etc"
          {...register('nome')}
          disabled={isLoading}
        />
        {errors.nome && <p className="text-sm text-red-600">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          placeholder="Informações adicionais sobre o lote"
          {...register('descricao')}
          disabled={isLoading}
          className="min-h-24"
        />
        {errors.descricao && <p className="text-sm text-red-600">{errors.descricao.message}</p>}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : lote ? (
            'Atualizar Lote'
          ) : (
            'Criar Lote'
          )}
        </Button>
      </div>
    </form>
  );
}
