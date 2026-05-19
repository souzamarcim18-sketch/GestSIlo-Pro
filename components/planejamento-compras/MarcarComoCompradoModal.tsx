'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { marcarComoCompradoAction } from '@/app/dashboard/planejamento-compras/actions';
import type { LinhaRelatorioCompras } from '@/lib/types/planejamento-compras';

const schema = z.object({
  quantidade_comprada: z
    .number()
    .positive('Quantidade deve ser maior que zero'),
  valor_unitario_pago: z
    .number()
    .positive('Valor deve ser maior que zero')
    .nullable()
    .optional(),
  data_compra: z.string().min(1, 'Informe a data de compra'),
});

type FormValues = z.infer<typeof schema>;

interface MarcarComoCompradoModalProps {
  linha: LinhaRelatorioCompras | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarcarComoCompradoModal({
  linha,
  onClose,
  onSuccess,
}: MarcarComoCompradoModalProps) {
  const [loading, setLoading] = useState(false);

  const hoje = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: linha
      ? {
          quantidade_comprada: linha.quantidade_a_comprar > 0 ? linha.quantidade_a_comprar : 1,
          valor_unitario_pago: linha.preco_unitario ?? undefined,
          data_compra: hoje,
        }
      : undefined,
  });

  async function onSubmit(values: FormValues) {
    if (!linha) return;
    setLoading(true);
    try {
      const result = await marcarComoCompradoAction({
        insumo_id: linha.insumo_id,
        quantidade_comprada: values.quantidade_comprada,
        valor_unitario_pago: values.valor_unitario_pago ?? null,
        data_compra: values.data_compra,
        planejamentos_ids: linha.planejamentos_ids,
      });

      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Compra registrada com sucesso');
        reset();
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!linha} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Compra</DialogTitle>
          {linha && (
            <p className="text-sm text-muted-foreground">
              {linha.insumo_nome}{' '}
              <span className="text-xs">({linha.unidade})</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Quantidade comprada */}
          <div className="space-y-1.5">
            <Label htmlFor="quantidade_comprada" className="text-sm">
              Quantidade comprada <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantidade_comprada"
              type="number"
              step="0.001"
              min="0.001"
              className="text-sm"
              {...register('quantidade_comprada', { valueAsNumber: true })}
            />
            {errors.quantidade_comprada && (
              <p className="text-xs text-destructive">{errors.quantidade_comprada.message}</p>
            )}
          </div>

          {/* Valor unitário pago */}
          <div className="space-y-1.5">
            <Label htmlFor="valor_unitario_pago" className="text-sm">
              Valor unitário pago{' '}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="valor_unitario_pago"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="R$ 0,00"
              className="text-sm"
              {...register('valor_unitario_pago', {
                setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
              })}
            />
            {errors.valor_unitario_pago && (
              <p className="text-xs text-destructive">{errors.valor_unitario_pago.message}</p>
            )}
          </div>

          {/* Data de compra */}
          <div className="space-y-1.5">
            <Label htmlFor="data_compra" className="text-sm">
              Data de compra <span className="text-destructive">*</span>
            </Label>
            <Input
              id="data_compra"
              type="date"
              className="text-sm"
              {...register('data_compra')}
            />
            {errors.data_compra && (
              <p className="text-xs text-destructive">{errors.data_compra.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
