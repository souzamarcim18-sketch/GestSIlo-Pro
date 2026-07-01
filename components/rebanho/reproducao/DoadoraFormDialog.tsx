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
import { criarDoadoraSchema, type CriarDoadoraInput } from '@/lib/validations/rebanho-reproducao';
import { criarDoadoraAction, editarDoadoraAction } from '@/app/dashboard/rebanho/doadoras/actions';
import type { Doadora } from '@/lib/types/rebanho-doadoras';

interface AnimalOption {
  id: string;
  brinco: string;
  nome: string | null;
}

interface DoadoraFormDialogProps {
  doadora?: Doadora;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Espécie pré-selecionada conforme o painel que abriu o dialog. */
  especiePadrao?: 'leiteiro' | 'corte' | 'dupla_aptidao';
  /** Fêmeas ativas do rebanho — usadas quando a doadora é interna. */
  animaisFemea: AnimalOption[];
}

const especieMap = {
  leiteiro: 'Leite',
  corte: 'Corte',
  dupla_aptidao: 'Dupla aptidão',
};

export function DoadoraFormDialog({
  doadora,
  isOpen,
  onOpenChange,
  onSuccess,
  especiePadrao = 'dupla_aptidao',
  animaisFemea,
}: DoadoraFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarDoadoraInput>({
    resolver: zodResolver(criarDoadoraSchema),
    defaultValues: doadora
      ? {
          nome: doadora.nome,
          origem: doadora.origem,
          tipo_rebanho: doadora.tipo_rebanho,
          animal_id: doadora.animal_id,
          raca: doadora.raca,
          numero_registro: doadora.numero_registro,
          data_entrada: doadora.data_entrada,
          observacoes: doadora.observacoes,
        }
      : {
          nome: '',
          origem: 'interna',
          tipo_rebanho: especiePadrao,
          animal_id: null,
          raca: '',
          numero_registro: '',
          data_entrada: new Date().toISOString().split('T')[0],
          observacoes: '',
        },
  });

  const origem = watch('origem');

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      // Ao trocar para externa, garante que animal_id não vaza.
      const payload = data.origem === 'externa' ? { ...data, animal_id: null } : data;
      const result = doadora
        ? await editarDoadoraAction(doadora.id, payload)
        : await criarDoadoraAction(payload);

      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }

      toast.success(doadora ? 'Doadora atualizada com sucesso' : 'Doadora criada com sucesso');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar doadora');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doadora ? 'Editar Doadora' : 'Nova Doadora'}</DialogTitle>
          <DialogDescription>
            Doadora de oócitos para FIV/OPU. Interna (fêmea do rebanho) ou externa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="origem">Origem *</Label>
            <Select
              value={origem}
              onValueChange={(v) => {
                setValue('origem', v as CriarDoadoraInput['origem']);
                if (v === 'externa') setValue('animal_id', null);
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="origem" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interna">Interna (do rebanho)</SelectItem>
                <SelectItem value="externa">Externa (outra fazenda)</SelectItem>
              </SelectContent>
            </Select>
            {errors.origem && <p className="text-sm text-red-600">{errors.origem.message}</p>}
          </div>

          {origem === 'interna' && (
            <div className="space-y-2">
              <Label htmlFor="animal_id">Fêmea do rebanho *</Label>
              <Select
                value={watch('animal_id') ?? undefined}
                onValueChange={(v) => setValue('animal_id', v)}
                disabled={isLoading}
              >
                <SelectTrigger id="animal_id" className="h-12">
                  <SelectValue placeholder="Selecione a fêmea..." />
                </SelectTrigger>
                <SelectContent>
                  {animaisFemea.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.brinco}
                      {a.nome ? ` — ${a.nome}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.animal_id && (
                <p className="text-sm text-red-600">{errors.animal_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome / Identificação *</Label>
            <Input
              id="nome"
              placeholder="Nome ou identificação da doadora..."
              {...register('nome')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.nome && <p className="text-sm text-red-600">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_rebanho">Espécie *</Label>
            <Select
              value={watch('tipo_rebanho')}
              onValueChange={(v) => setValue('tipo_rebanho', v as CriarDoadoraInput['tipo_rebanho'])}
              disabled={isLoading}
            >
              <SelectTrigger id="tipo_rebanho" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(especieMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_rebanho && (
              <p className="text-sm text-red-600">{errors.tipo_rebanho.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="raca">Raça</Label>
            <Input
              id="raca"
              placeholder="Ex: Nelore, Gir..."
              {...register('raca')}
              disabled={isLoading}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_registro">Número de Registro</Label>
            <Input
              id="numero_registro"
              placeholder="Registro genealógico..."
              {...register('numero_registro')}
              disabled={isLoading}
              className="h-12"
            />
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
              placeholder="Observações sobre a doadora..."
              {...register('observacoes')}
              disabled={isLoading}
              className="min-h-20 resize-none"
            />
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
            <Button type="submit" disabled={isLoading} className="flex-1 h-12">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : doadora ? (
                'Atualizar'
              ) : (
                'Criar Doadora'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
