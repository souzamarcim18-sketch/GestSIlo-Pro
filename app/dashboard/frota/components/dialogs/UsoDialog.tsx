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
import { type Maquina } from '@/lib/supabase';
import { type Talhao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const usoSchema = z
  .object({
    maquina_id: z.string().min(1, 'Selecione uma máquina'),
    data: z.string().min(1, 'Data é obrigatória'),
    operador: z.string().optional(),
    atividade: z.string().optional(),
    tipo_operacao: z.string().optional(),
    // Horímetro: se ambos preenchidos, horas é calculado automaticamente.
    // Se ambos vazios, aceita entrada manual de horas.
    horimetro_inicio: z.number().nonnegative('Valor não pode ser negativo').nullable().optional(),
    horimetro_fim: z.number().nonnegative('Valor não pode ser negativo').nullable().optional(),
    horas: z.number().nonnegative('Horas não pode ser negativo').nullable().optional(),
    km: z.number().nonnegative('KM não pode ser negativo').nullable().optional(),
    implemento_id: z.string().optional(),
    talhao_id: z.string().optional(),
    area_ha: z.number().nonnegative('Área não pode ser negativa').nullable().optional(),
  })
  .refine(
    (d) => {
      // Se horimetro_fim preenchido, deve ser maior que horimetro_inicio
      if (d.horimetro_inicio != null && d.horimetro_fim != null) {
        return d.horimetro_fim >= d.horimetro_inicio;
      }
      return true;
    },
    { message: 'Horímetro final deve ser maior ou igual ao inicial', path: ['horimetro_fim'] }
  );

type UsoFormData = z.infer<typeof usoSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface UsoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  talhoes: Talhao[];
  onSuccess: () => void;
}

const TIPOS_OPERACAO = [
  'Plantio',
  'Colheita',
  'Pulverização',
  'Adubação',
  'Transporte',
  'Ensilagem',
  'Roçagem',
  'Preparo de solo',
  'Irrigação',
  'Outros',
] as const;

export function UsoDialog({ open, onOpenChange, maquinas, talhoes, onSuccess }: UsoDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UsoFormData>({
    resolver: zodResolver(usoSchema),
    defaultValues: {
      maquina_id: '',
      data: new Date().toISOString().split('T')[0],
      horimetro_inicio: null,
      horimetro_fim: null,
      horas: null,
      km: null,
      area_ha: null,
    },
  });

  const horimetroInicio = watch('horimetro_inicio');
  const horimetroFim = watch('horimetro_fim');
  const maquinaId = watch('maquina_id');

  // Calcular horas automaticamente quando ambos horímetros estão preenchidos.
  // Esse valor sobrescreve qualquer entrada manual e é enviado no payload.
  const horasCalculadas =
    horimetroInicio != null && horimetroFim != null && horimetroFim >= horimetroInicio
      ? +(horimetroFim - horimetroInicio).toFixed(2)
      : null;

  const horasAutoMode = horimetroInicio != null && horimetroFim != null;

  // Sincronizar campo horas quando calculado automaticamente
  useEffect(() => {
    if (horasAutoMode && horasCalculadas != null) {
      setValue('horas', horasCalculadas);
    }
  }, [horasAutoMode, horasCalculadas, setValue]);

  // Máquinas ativas (status != 'Vendido')
  const maquinasAtivas = maquinas.filter((m) => m.status !== 'Vendido');

  // Implementos disponíveis
  const implementos = maquinas.filter((m) => m.tipo === 'Implemento');

  const onSubmit = async (data: UsoFormData) => {
    try {
      // Regra de cálculo de horas:
      // Se ambos horímetros preenchidos → horas = fim - inicio (calculado, ignora input manual).
      // Se não → usa o valor digitado manualmente.
      const horasFinal =
        data.horimetro_inicio != null && data.horimetro_fim != null
          ? +(data.horimetro_fim - data.horimetro_inicio).toFixed(2)
          : data.horas ?? null;

      await q.usoMaquinas.create({
        maquina_id: data.maquina_id,
        data: data.data,
        operador: data.operador || null,
        atividade: data.atividade || null,
        tipo_operacao: data.tipo_operacao || null,
        horimetro_inicio: data.horimetro_inicio ?? null,
        horimetro_fim: data.horimetro_fim ?? null,
        horas: horasFinal,
        km: data.km ?? null,
        implemento_id: data.implemento_id || null,
        talhao_id: data.talhao_id || null,
        area_ha: data.area_ha ?? null,
        origem: 'manual',
      } as any);

      toast.success('Uso registrado com sucesso!');
      reset();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar uso');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Uso Diário</DialogTitle>
          <DialogDescription>
            Registre horas trabalhadas, atividade e dados operacionais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Máquina + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uso-maquina">Máquina *</Label>
              <Controller
                control={control}
                name="maquina_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger id="uso-maquina">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinasAtivas.map((m) => (
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
            <div className="space-y-2">
              <Label htmlFor="uso-data">Data *</Label>
              <Input id="uso-data" type="date" {...register('data')} />
              {errors.data && (
                <p className="text-xs text-destructive">{errors.data.message}</p>
              )}
            </div>
          </div>

          {/* Operador + Atividade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uso-operador">Operador</Label>
              <Input id="uso-operador" placeholder="Nome do operador" {...register('operador')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uso-atividade">Atividade</Label>
              <Input id="uso-atividade" placeholder="Ex: Plantio de milho" {...register('atividade')} />
            </div>
          </div>

          {/* Tipo de Operação */}
          <div className="space-y-2">
            <Label htmlFor="uso-tipo">Tipo de Operação</Label>
            <Controller
              control={control}
              name="tipo_operacao"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <SelectTrigger id="uso-tipo">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OPERACAO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Horímetros */}
          <div className="p-4 bg-muted/40 rounded-lg space-y-3">
            <p className="text-sm font-medium">Horímetro</p>
            <p className="text-xs text-muted-foreground">
              Preencha início e fim para calcular horas automaticamente. Caso contrário, informe as horas manualmente.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uso-hor-ini" className="text-xs">
                  Início
                </Label>
                <Input
                  id="uso-hor-ini"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  {...register('horimetro_inicio', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
                />
                {errors.horimetro_inicio && (
                  <p className="text-xs text-destructive">{errors.horimetro_inicio.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="uso-hor-fim" className="text-xs">
                  Fim
                </Label>
                <Input
                  id="uso-hor-fim"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  {...register('horimetro_fim', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
                />
                {errors.horimetro_fim && (
                  <p className="text-xs text-destructive">{errors.horimetro_fim.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="uso-horas" className="text-xs">
                  Horas {horasAutoMode ? '(calculado)' : '(manual)'}
                </Label>
                <Input
                  id="uso-horas"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  readOnly={horasAutoMode}
                  className={horasAutoMode ? 'bg-muted cursor-not-allowed' : ''}
                  {...register('horas', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
                />
                {errors.horas && (
                  <p className="text-xs text-destructive">{errors.horas.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* KM + Área */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uso-km">KM Rodados</Label>
              <Input
                id="uso-km"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...register('km', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
              />
              {errors.km && <p className="text-xs text-destructive">{errors.km.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="uso-area">Área (ha)</Label>
              <Input
                id="uso-area"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('area_ha', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
              />
              {errors.area_ha && <p className="text-xs text-destructive">{errors.area_ha.message}</p>}
            </div>
          </div>

          {/* Implemento + Talhão */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uso-implemento">Implemento</Label>
              <Controller
                control={control}
                name="implemento_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger id="uso-implemento">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {implementos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uso-talhao">Talhão</Label>
              <Controller
                control={control}
                name="talhao_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger id="uso-talhao">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {talhoes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Registrar Uso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
