'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import {
  avaliacaoPspsSchema,
  MOMENTOS_AVALIACAO,
} from '@/lib/validations/silos';
import type { AvaliacaoPspsInput } from '@/lib/validations/silos';
import type { Silo } from '@/lib/supabase';

interface AvaliacaoPspsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  onSuccess: () => void;
}

// Faixas ideais para cada peneira (%)
const FAIXAS_IDEAIS = {
  peneira_19mm: { min: 3, max: 8 },
  peneira_8_19mm: { min: 45, max: 65 },
  peneira_4_8mm: { min: 20, max: 30 },
  peneira_fundo_4mm: { min: 5, max: 10 },
};

export function AvaliacaoPspsDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: AvaliacaoPspsDialogProps) {
  const [silo, setSilo] = useState<Silo | null>(null);
  const [loadingSilo, setLoadingSilo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AvaliacaoPspsInput>({
    resolver: zodResolver(avaliacaoPspsSchema),
    defaultValues: {
      silo_id: siloId,
      data: new Date().toISOString().split('T')[0],
      momento: 'Fechamento',
      peneira_19mm: 0,
      peneira_8_19mm: 0,
      peneira_4_8mm: 0,
      peneira_fundo_4mm: 0,
      tamanho_teorico_corte_mm: null,
      kernel_processor: false,
      avaliador: '',
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = form;

  const peneira19mm = watch('peneira_19mm') || 0;
  const peneira8_19mm = watch('peneira_8_19mm') || 0;
  const peneira4_8mm = watch('peneira_4_8mm') || 0;
  const peneiraFundo4mm = watch('peneira_fundo_4mm') || 0;

  const soma =
    Number(peneira19mm) +
    Number(peneira8_19mm) +
    Number(peneira4_8mm) +
    Number(peneiraFundo4mm);

  const somaValida = soma >= 99.5 && soma <= 100.5;

  // Fetch silo ao abrir
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoadingSilo(true);
        const siloData = await q.silos.getById(siloId);
        setSilo(siloData);
      } catch {
        toast.error('Erro ao carregar silo');
      } finally {
        setLoadingSilo(false);
      }
    };

    loadData();
  }, [open, siloId]);

  const onSubmit = async (data: AvaliacaoPspsInput) => {
    try {
      setSubmitting(true);

      await q.avaliacoesPsps.create({
        silo_id: data.silo_id,
        data: data.data,
        momento: data.momento,
        peneira_19mm: data.peneira_19mm,
        peneira_8_19mm: data.peneira_8_19mm,
        peneira_4_8mm: data.peneira_4_8mm,
        peneira_fundo_4mm: data.peneira_fundo_4mm,
        tamanho_teorico_corte_mm: data.tamanho_teorico_corte_mm || null,
        kernel_processor: data.kernel_processor,
        avaliador: data.avaliador || null,
      } as any);

      toast.success('Avaliação PSPS registrada com sucesso!');
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao registrar avaliação';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPeneiraStatus = (valor: number, faixa: (typeof FAIXAS_IDEAIS)[keyof typeof FAIXAS_IDEAIS]) => {
    if (valor < faixa.min || valor > faixa.max) {
      return { status: 'fora', cor: 'bg-red-500' };
    }
    return { status: 'ok', cor: 'bg-green-500' };
  };

  const renderPeneiraField = (
    name: keyof Omit<AvaliacaoPspsInput, keyof Omit<AvaliacaoPspsInput, 'peneira_19mm' | 'peneira_8_19mm' | 'peneira_4_8mm' | 'peneira_fundo_4mm'>>,
    label: string,
    faixa: (typeof FAIXAS_IDEAIS)[keyof typeof FAIXAS_IDEAIS]
  ) => {
    const valor = watch(name as any) || 0;
    const { status, cor } = getPeneiraStatus(Number(valor), faixa);
    const statusEmoji = status === 'ok' ? '✓' : '✗';

    return (
      <div key={name} className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor={name}>{label}</Label>
          <span className="text-sm font-semibold">
            {valor.toFixed(1)}% {statusEmoji}
          </span>
        </div>
        <Input
          id={name}
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder="0"
          {...register(name as any, { valueAsNumber: true })}
          disabled={submitting}
        />
        {/* Barra visual */}
        <div className="w-full bg-gray-200 rounded h-6 overflow-hidden">
          <div
            className={`h-full ${cor} transition-all`}
            style={{ width: `${Math.min(valor, 100)}%` }}
          />
        </div>
        {/* Faixa ideal */}
        <p className="text-xs text-gray-600">
          Faixa ideal: {faixa.min}% - {faixa.max}%
        </p>
        {errors[name as keyof typeof errors] && (
          <p className="text-sm text-red-500">
            {(errors[name as keyof typeof errors] as any)?.message}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Avaliação PSPS</DialogTitle>
          <DialogDescription>
            {silo ? `Silo: ${silo.nome}` : 'Registre uma avaliação PSPS'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Data */}
          <div>
            <Label htmlFor="data">Data *</Label>
            <Input
              id="data"
              type="date"
              {...register('data')}
              disabled={submitting}
            />
            {errors.data && (
              <p className="text-sm text-red-500 mt-1">{errors.data.message}</p>
            )}
          </div>

          {/* Momento */}
          <div>
            <Label htmlFor="momento">Momento *</Label>
            <Controller
              name="momento"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={submitting}
                >
                  <SelectTrigger id="momento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOMENTOS_AVALIACAO.map((momento) => (
                      <SelectItem key={momento} value={momento}>
                        {momento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.momento && (
              <p className="text-sm text-red-500 mt-1">
                {errors.momento.message}
              </p>
            )}
          </div>

          {/* PENEIRAS */}
          <div className="space-y-4 bg-blue-50 p-4 rounded">
            {renderPeneiraField('peneira_19mm', 'Peneira 19mm', FAIXAS_IDEAIS.peneira_19mm)}
            {renderPeneiraField('peneira_8_19mm', 'Peneira 8-19mm', FAIXAS_IDEAIS.peneira_8_19mm)}
            {renderPeneiraField('peneira_4_8mm', 'Peneira 4-8mm', FAIXAS_IDEAIS.peneira_4_8mm)}
            {renderPeneiraField('peneira_fundo_4mm', 'Peneira Fundo 4mm', FAIXAS_IDEAIS.peneira_fundo_4mm)}

            {/* Soma */}
            <Alert className={somaValida ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}>
              <AlertDescription>
                <span className="font-semibold">Soma das peneiras: {soma.toFixed(2)}%</span>
                {somaValida ? (
                  <span className="text-green-700 ml-2">✓ Válido</span>
                ) : (
                  <span className="text-red-700 ml-2">✗ Deve ser 100% ±0.5%</span>
                )}
              </AlertDescription>
            </Alert>
          </div>

          {/* Tamanho teórico do corte */}
          <div>
            <Label htmlFor="tamanho_teorico_corte_mm">Tamanho Teórico do Corte (mm)</Label>
            <Input
              id="tamanho_teorico_corte_mm"
              type="number"
              step="0.1"
              placeholder="0"
              {...register('tamanho_teorico_corte_mm')}
              disabled={submitting}
            />
          </div>

          {/* Kernel Processor */}
          <div className="flex items-center gap-2">
            <Controller
              name="kernel_processor"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="kernel_processor"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={submitting}
                />
              )}
            />
            <Label htmlFor="kernel_processor">Kernel Processor</Label>
          </div>

          {/* Avaliador */}
          <div>
            <Label htmlFor="avaliador">Avaliador</Label>
            <Input
              id="avaliador"
              placeholder="Nome de quem realizou a avaliação"
              {...register('avaliador')}
              disabled={submitting}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !somaValida}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
