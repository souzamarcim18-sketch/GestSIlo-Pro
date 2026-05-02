'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Animal, Lote } from '@/lib/types/rebanho';
import {
  criarAnimalSchema,
  editarAnimalSchema,
  type CriarAnimalInput,
  type EditarAnimalInput,
} from '@/lib/validations/rebanho';

interface AnimalFormProps {
  lotes: Lote[];
  animais: Animal[];
  animal?: Animal;
  onSubmit: (data: CriarAnimalInput | EditarAnimalInput) => Promise<void>;
  onSuccess?: () => void;
  isLoading?: boolean;
}

export function AnimalForm({
  lotes,
  animais,
  animal,
  onSubmit,
  onSuccess,
  isLoading = false,
}: AnimalFormProps) {
  const schema = animal ? editarAnimalSchema : criarAnimalSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CriarAnimalInput | EditarAnimalInput>({
    resolver: zodResolver(schema),
    defaultValues: animal
      ? {
          sexo: animal.sexo,
          data_nascimento: animal.data_nascimento,
          lote_id: animal.lote_id,
          mae_id: animal.mae_id,
          pai_id: animal.pai_id,
          raca: animal.raca,
          observacoes: animal.observacoes,
        }
      : {
          brinco: '',
          sexo: 'Macho',
          tipo_rebanho: 'leiteiro',
          data_nascimento: new Date().toISOString().split('T')[0],
          lote_id: null,
          mae_id: null,
          pai_id: null,
          raca: null,
          observacoes: null,
        },
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar animal');
    }
  });

  const sexoWatch = watch('sexo');
  const animaisFemea = animais.filter((a) => a.sexo === 'Fêmea' && a.status === 'Ativo');
  const animaisMacho = animais.filter((a) => a.sexo === 'Macho' && a.status === 'Ativo');

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {!animal && (
        <div className="space-y-2">
          <Label htmlFor="brinco">Brinco *</Label>
          <Input
            id="brinco"
            placeholder="Ex: 001, A-2024, etc"
            {...register('brinco')}
            disabled={isLoading}
          />
          {'brinco' in errors && errors.brinco && (
            <p className="text-sm text-red-600">{errors.brinco.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sexo">Sexo *</Label>
          <Select
            value={sexoWatch}
            onValueChange={(v) => {
              if (v) setValue('sexo', v as 'Macho' | 'Fêmea');
            }}
            disabled={isLoading}
          >
            <SelectTrigger id="sexo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Macho">♂ Macho</SelectItem>
              <SelectItem value="Fêmea">♀ Fêmea</SelectItem>
            </SelectContent>
          </Select>
          {errors.sexo && <p className="text-sm text-red-600">{errors.sexo.message}</p>}
        </div>

        {!animal && (
          <div className="space-y-2">
            <Label htmlFor="tipo_rebanho">Tipo de Rebanho *</Label>
            <Select
              defaultValue="leiteiro"
              onValueChange={(v) => {
                if (v) setValue('tipo_rebanho', v as 'leiteiro' | 'corte');
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="tipo_rebanho">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leiteiro">Leiteiro</SelectItem>
                <SelectItem value="corte">Corte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
        <Input
          id="data_nascimento"
          type="date"
          {...register('data_nascimento')}
          disabled={isLoading}
        />
        {errors.data_nascimento && (
          <p className="text-sm text-red-600">{errors.data_nascimento.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lote_id">Lote</Label>
        <Select
          onValueChange={(v) => setValue('lote_id', v || null)}
          disabled={isLoading}
        >
          <SelectTrigger id="lote_id">
            <SelectValue placeholder="Sem lote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sem lote</SelectItem>
            {lotes.map((lote) => (
              <SelectItem key={lote.id} value={lote.id}>
                {lote.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.lote_id && <p className="text-sm text-red-600">{errors.lote_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mae_id">Mãe</Label>
          <Select
            onValueChange={(v) => setValue('mae_id', v || null)}
            disabled={isLoading}
          >
            <SelectTrigger id="mae_id">
              <SelectValue placeholder="Sem mãe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem mãe</SelectItem>
              {animaisFemea.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.brinco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.mae_id && <p className="text-sm text-red-600">{errors.mae_id.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pai_id">Pai</Label>
          <Select
            onValueChange={(v) => setValue('pai_id', v || null)}
            disabled={isLoading}
          >
            <SelectTrigger id="pai_id">
              <SelectValue placeholder="Sem pai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem pai</SelectItem>
              {animaisMacho.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.brinco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.pai_id && <p className="text-sm text-red-600">{errors.pai_id.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="raca">Raça</Label>
        <Input
          id="raca"
          placeholder="Ex: Holandês, Nelore, etc"
          {...register('raca')}
          disabled={isLoading}
        />
        {errors.raca && <p className="text-sm text-red-600">{errors.raca.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          placeholder="Notas adicionais sobre o animal"
          {...register('observacoes')}
          disabled={isLoading}
          className="min-h-24"
        />
        {errors.observacoes && (
          <p className="text-sm text-red-600">{errors.observacoes.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : animal ? (
            'Atualizar Animal'
          ) : (
            'Criar Animal'
          )}
        </Button>
      </div>
    </form>
  );
}
