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
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import {
  avaliacaoBromatologicaSchema,
  MOMENTOS_AVALIACAO,
} from '@/lib/validations/silos';
import type { AvaliacaoBromatologicaInput } from '@/lib/validations/silos';
import type { Silo } from '@/lib/supabase';

interface AvaliacaoBromatologicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId: string;
  onSuccess: () => void;
}

export function AvaliacaoBromatologicaDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: AvaliacaoBromatologicaDialogProps) {
  const [silo, setSilo] = useState<Silo | null>(null);
  const [loadingSilo, setLoadingSilo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AvaliacaoBromatologicaInput>({
    resolver: zodResolver(avaliacaoBromatologicaSchema),
    defaultValues: {
      silo_id: siloId,
      data: new Date().toISOString().split('T')[0],
      momento: 'Fechamento',
      ms: null,
      pb: null,
      fdn: null,
      fda: null,
      ee: null,
      mm: null,
      amido: null,
      ndt: null,
      ph: null,
      avaliador: '',
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = form;

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

  const onSubmit = async (data: AvaliacaoBromatologicaInput) => {
    try {
      setSubmitting(true);

      await q.avaliacoesBromatologicas.create({
        silo_id: data.silo_id,
        data: data.data,
        momento: data.momento,
        ms: data.ms || null,
        pb: data.pb || null,
        fdn: data.fdn || null,
        fda: data.fda || null,
        ee: data.ee || null,
        mm: data.mm || null,
        amido: data.amido || null,
        ndt: data.ndt || null,
        ph: data.ph || null,
        avaliador: data.avaliador || null,
      });

      toast.success('Avaliação bromatológica registrada com sucesso!');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Avaliação Bromatológica</DialogTitle>
          <DialogDescription>
            {silo ? `Silo: ${silo.nome}` : 'Registre uma avaliação bromatológica'}
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

          {/* MS */}
          <div>
            <Label htmlFor="ms">MS (%)</Label>
            <Input
              id="ms"
              type="number"
              step="0.01"
              placeholder="Matéria Seca"
              {...register('ms')}
              disabled={submitting}
            />
            {errors.ms && (
              <p className="text-sm text-red-500 mt-1">{errors.ms.message}</p>
            )}
          </div>

          {/* PB */}
          <div>
            <Label htmlFor="pb">PB (%)</Label>
            <Input
              id="pb"
              type="number"
              step="0.01"
              placeholder="Proteína Bruta"
              {...register('pb')}
              disabled={submitting}
            />
            {errors.pb && (
              <p className="text-sm text-red-500 mt-1">{errors.pb.message}</p>
            )}
          </div>

          {/* FDN */}
          <div>
            <Label htmlFor="fdn">FDN (%)</Label>
            <Input
              id="fdn"
              type="number"
              step="0.01"
              placeholder="Fibra em Detergente Neutro"
              {...register('fdn')}
              disabled={submitting}
            />
            {errors.fdn && (
              <p className="text-sm text-red-500 mt-1">{errors.fdn.message}</p>
            )}
          </div>

          {/* FDA */}
          <div>
            <Label htmlFor="fda">FDA (%)</Label>
            <Input
              id="fda"
              type="number"
              step="0.01"
              placeholder="Fibra em Detergente Ácido"
              {...register('fda')}
              disabled={submitting}
            />
            {errors.fda && (
              <p className="text-sm text-red-500 mt-1">{errors.fda.message}</p>
            )}
          </div>

          {/* EE */}
          <div>
            <Label htmlFor="ee">EE (%)</Label>
            <Input
              id="ee"
              type="number"
              step="0.01"
              placeholder="Extrato Etéreo"
              {...register('ee')}
              disabled={submitting}
            />
            {errors.ee && (
              <p className="text-sm text-red-500 mt-1">{errors.ee.message}</p>
            )}
          </div>

          {/* MM */}
          <div>
            <Label htmlFor="mm">MM (%)</Label>
            <Input
              id="mm"
              type="number"
              step="0.01"
              placeholder="Matéria Mineral"
              {...register('mm')}
              disabled={submitting}
            />
            {errors.mm && (
              <p className="text-sm text-red-500 mt-1">{errors.mm.message}</p>
            )}
          </div>

          {/* Amido */}
          <div>
            <Label htmlFor="amido">Amido (%)</Label>
            <Input
              id="amido"
              type="number"
              step="0.01"
              placeholder="Amido"
              {...register('amido')}
              disabled={submitting}
            />
            {errors.amido && (
              <p className="text-sm text-red-500 mt-1">{errors.amido.message}</p>
            )}
          </div>

          {/* NDT */}
          <div>
            <Label htmlFor="ndt">NDT (%)</Label>
            <Input
              id="ndt"
              type="number"
              step="0.01"
              placeholder="Nutrientes Digestíveis Totais"
              {...register('ndt')}
              disabled={submitting}
            />
            {errors.ndt && (
              <p className="text-sm text-red-500 mt-1">{errors.ndt.message}</p>
            )}
          </div>

          {/* pH */}
          <div>
            <Label htmlFor="ph">pH</Label>
            <Input
              id="ph"
              type="number"
              step="0.01"
              placeholder="pH (0-14)"
              {...register('ph')}
              disabled={submitting}
            />
            {errors.ph && (
              <p className="text-sm text-red-500 mt-1">{errors.ph.message}</p>
            )}
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
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
