'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { type Maquina, type PlanoManutencao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const planoSchema = z
  .object({
    maquina_id: z.string().min(1, 'Selecione uma máquina'),
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    modo: z.enum(['horimetro', 'tempo', 'ambos']),
    intervalo_horas: z.number().positive('Deve ser positivo').nullable().optional(),
    intervalo_dias: z.number().positive('Deve ser positivo').nullable().optional(),
    horimetro_base: z.number().nonnegative('Deve ser ≥ 0').nullable().optional(),
    data_base: z.string().nullable().optional(),
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const precisaHoras = data.modo === 'horimetro' || data.modo === 'ambos';
    const precisaDias = data.modo === 'tempo' || data.modo === 'ambos';
    if (precisaHoras && !data.intervalo_horas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Intervalo em horas é obrigatório para este modo',
        path: ['intervalo_horas'],
      });
    }
    if (precisaDias && !data.intervalo_dias) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Intervalo em dias é obrigatório para este modo',
        path: ['intervalo_dias'],
      });
    }
  });

type PlanoFormData = z.infer<typeof planoSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PlanoManutencaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  plano?: PlanoManutencao;
  onSuccess: () => void;
}

export function PlanoManutencaoDialog({
  open,
  onOpenChange,
  maquinas,
  plano,
  onSuccess,
}: PlanoManutencaoDialogProps) {
  const isEditing = !!plano;

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanoFormData>({
    resolver: zodResolver(planoSchema),
    defaultValues: {
      maquina_id: '',
      descricao: '',
      modo: 'horimetro',
      intervalo_horas: null,
      intervalo_dias: null,
      horimetro_base: null,
      data_base: null,
      ativo: true,
    },
  });

  const modo = watch('modo');

  useEffect(() => {
    if (open) {
      if (plano) {
        let modo: PlanoFormData['modo'] = 'horimetro';
        if (plano.intervalo_horas && plano.intervalo_dias) modo = 'ambos';
        else if (plano.intervalo_dias && !plano.intervalo_horas) modo = 'tempo';
        reset({
          maquina_id: plano.maquina_id,
          descricao: plano.descricao,
          modo,
          intervalo_horas: plano.intervalo_horas ?? null,
          intervalo_dias: plano.intervalo_dias ?? null,
          horimetro_base: plano.horimetro_base ?? null,
          data_base: plano.data_base ?? null,
          ativo: plano.ativo,
        });
      } else {
        reset({
          maquina_id: '',
          descricao: '',
          modo: 'horimetro',
          intervalo_horas: null,
          intervalo_dias: null,
          horimetro_base: null,
          data_base: null,
          ativo: true,
        });
      }
    }
  }, [open, plano, reset]);

  // Máquinas autopropelidas (sem Implemento)
  const maquinasAutopropelidas = maquinas.filter((m) => m.tipo !== 'Implemento');

  const onSubmit = async (data: PlanoFormData) => {
    try {
      const payload = {
        maquina_id: data.maquina_id,
        descricao: data.descricao,
        intervalo_horas: (data.modo === 'horimetro' || data.modo === 'ambos') ? (data.intervalo_horas ?? null) : null,
        intervalo_dias: (data.modo === 'tempo' || data.modo === 'ambos') ? (data.intervalo_dias ?? null) : null,
        horimetro_base: data.horimetro_base ?? null,
        data_base: data.data_base || null,
        ativo: data.ativo,
      };

      if (isEditing && plano) {
        await q.planosManutencao.update(plano.id, payload);
        toast.success('Plano atualizado com sucesso');
      } else {
        await q.planosManutencao.create(payload as Parameters<typeof q.planosManutencao.create>[0]);
        toast.success('Plano criado com sucesso');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar plano');
    }
  };

  const mostraHoras = modo === 'horimetro' || modo === 'ambos';
  const mostraDias = modo === 'tempo' || modo === 'ambos';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Plano' : 'Novo Plano de Manutenção'}</DialogTitle>
          <DialogDescription>
            Defina o intervalo de revisão preventiva por horímetro e/ou por calendário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* Máquina */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-maquina">Máquina</Label>
            <Controller
              name="maquina_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="pm-maquina">
                    <SelectValue placeholder="Selecione a máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinasAutopropelidas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.maquina_id && (
              <p className="text-xs text-destructive">{errors.maquina_id.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-descricao">Descrição do serviço</Label>
            <Input id="pm-descricao" placeholder="Ex: Troca de óleo e filtros" {...register('descricao')} />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          {/* Modo de intervalo */}
          <div className="space-y-2">
            <Label>Modo de intervalo</Label>
            <Controller
              name="modo"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {(['horimetro', 'tempo', 'ambos'] as const).map((opcao) => (
                    <label
                      key={opcao}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                        field.value === opcao
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={opcao}
                        checked={field.value === opcao}
                        onChange={() => field.onChange(opcao)}
                      />
                      {opcao === 'horimetro' ? 'Por horímetro' : opcao === 'tempo' ? 'Por tempo' : 'Ambos'}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Intervalo em horas */}
          {mostraHoras && (
            <div className="space-y-1.5">
              <Label htmlFor="pm-int-horas">Intervalo em horas (h)</Label>
              <Input
                id="pm-int-horas"
                type="number"
                min={1}
                placeholder="Ex: 250"
                {...register('intervalo_horas', { valueAsNumber: true })}
              />
              {errors.intervalo_horas && (
                <p className="text-xs text-destructive">{errors.intervalo_horas.message}</p>
              )}
            </div>
          )}

          {/* Intervalo em dias */}
          {mostraDias && (
            <div className="space-y-1.5">
              <Label htmlFor="pm-int-dias">Intervalo em dias</Label>
              <Input
                id="pm-int-dias"
                type="number"
                min={1}
                placeholder="Ex: 90"
                {...register('intervalo_dias', { valueAsNumber: true })}
              />
              {errors.intervalo_dias && (
                <p className="text-xs text-destructive">{errors.intervalo_dias.message}</p>
              )}
            </div>
          )}

          {/* Horímetro base */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-hor-base">Horímetro do último serviço (h)</Label>
            <Input
              id="pm-hor-base"
              type="number"
              min={0}
              step={0.1}
              placeholder="Ex: 1540.5"
              {...register('horimetro_base', { valueAsNumber: true })}
            />
          </div>

          {/* Data base */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-data-base">Data do último serviço</Label>
            <Input id="pm-data-base" type="date" {...register('data_base')} />
          </div>

          {/* Ativo toggle */}
          <div className="flex items-center gap-3">
            <Controller
              name="ativo"
              control={control}
              render={({ field }) => (
                <input
                  id="pm-ativo"
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
              )}
            />
            <Label htmlFor="pm-ativo" className="cursor-pointer">
              Plano ativo
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
