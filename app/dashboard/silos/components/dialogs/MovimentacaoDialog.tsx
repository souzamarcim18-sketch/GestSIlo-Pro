'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { movimentacaoSiloSchema, type MovimentacaoSiloInput, SUBTIPOS_MOVIMENTACAO } from '@/lib/validations/silos';
import { z } from 'zod';
import { type Silo } from '@/lib/supabase';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import { AlertTriangle } from 'lucide-react';

const movimentacaoDialogSchema = movimentacaoSiloSchema.and(
  z.object({
    valor_unitario: z.number().positive().optional(),
    comprador: z.string().max(150).optional(),
  })
);
type MovimentacaoDialogInput = z.infer<typeof movimentacaoDialogSchema>;

const TODAY = new Date().toISOString().split('T')[0];

interface MovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  silos: Silo[];
  siloId?: string;
  onSuccess: () => void;
}

export function MovimentacaoDialog({
  open,
  onOpenChange,
  silos,
  siloId,
  onSuccess,
}: MovimentacaoDialogProps) {
  const [jaTemEntrada, setJaTemEntrada] = useState(false);
  const [checandoEntrada, setChecandoEntrada] = useState(false);

  const form = useForm<MovimentacaoDialogInput>({
    resolver: zodResolver(movimentacaoDialogSchema),
    defaultValues: {
      silo_id: siloId || '',
      tipo: 'Saída',
      subtipo: undefined,
      quantidade: undefined as any,
      data: TODAY,
      responsavel: '',
      observacao: '',
      valor_unitario: undefined,
      comprador: '',
    },
  });

  const tipoAtual = form.watch('tipo');
  const subtipoAtual = form.watch('subtipo');
  const siloIdAtual = form.watch('silo_id');

  // Verificar hasEntrada quando o silo muda ou o dialog abre
  useEffect(() => {
    const targetId = siloId || siloIdAtual;
    if (!open || !targetId) {
      setJaTemEntrada(false);
      return;
    }
    setChecandoEntrada(true);
    q.movimentacoesSilo
      .hasEntrada(targetId)
      .then((has) => setJaTemEntrada(has))
      .catch(() => setJaTemEntrada(false))
      .finally(() => setChecandoEntrada(false));
  }, [open, siloId, siloIdAtual]); // q é import de módulo estável; setters de useState são estáveis por garantia do React

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      form.reset({
        silo_id: siloId || '',
        tipo: 'Saída',
        subtipo: undefined,
        quantidade: undefined as any,
        data: TODAY,
        responsavel: '',
        observacao: '',
        valor_unitario: undefined,
        comprador: '',
      });
      setJaTemEntrada(false);
    }
  }, [open, form, siloId]);

  // Limpar campos de venda quando o subtipo mudar para algo diferente de 'Venda'
  useEffect(() => {
    if (subtipoAtual !== 'Venda') {
      form.setValue('valor_unitario', undefined);
      form.setValue('comprador', '');
    }
  }, [subtipoAtual, form]);

  const handleSubmit = async (data: MovimentacaoDialogInput) => {
    try {
      await q.movimentacoesSilo.create({
        silo_id: data.silo_id,
        tipo: data.tipo,
        subtipo: data.tipo === 'Saída' ? (data.subtipo ?? null) : null,
        quantidade: data.quantidade,
        data: data.data,
        responsavel: data.responsavel || null,
        observacao: data.observacao || null,
        talhao_id: null,
        valor_unitario: data.subtipo === 'Venda' ? (data.valor_unitario ?? null) : null,
        comprador: data.subtipo === 'Venda' ? (data.comprador || null) : null,
      } as any);
      toast.success('Movimentação registrada com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar movimentação');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>Registre saída de silagem do silo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Silo (dropdown apenas quando não fixo) */}
          {!siloId && (
            <div className="space-y-2">
              <Label htmlFor="mov-silo">Silo</Label>
              <Controller
                control={form.control}
                name="silo_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="mov-silo">
                      <SelectValue placeholder="Selecione o silo" />
                    </SelectTrigger>
                    <SelectContent>
                      {silos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.silo_id && (
                <p className="text-sm text-destructive">{form.formState.errors.silo_id.message}</p>
              )}
            </div>
          )}

          {/* Alerta: silo já tem entrada */}
          {jaTemEntrada && !checandoEntrada && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Este silo já possui uma entrada registrada. Registre apenas saídas.
              </AlertDescription>
            </Alert>
          )}

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="mov-tipo">Tipo</Label>
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="mov-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!jaTemEntrada && (
                      <SelectItem value="Entrada">Entrada</SelectItem>
                    )}
                    <SelectItem value="Saída">Saída</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.tipo && (
              <p className="text-sm text-destructive">{form.formState.errors.tipo.message}</p>
            )}
          </div>

          {/* Subtipo — apenas para Saída */}
          {tipoAtual === 'Saída' && (
            <div className="space-y-2">
              <Label htmlFor="mov-subtipo">
                Subtipo <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="subtipo"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger id="mov-subtipo">
                      <SelectValue placeholder="Selecione o destino da saída" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBTIPOS_MOVIMENTACAO.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.subtipo && (
                <p className="text-sm text-destructive">{form.formState.errors.subtipo.message}</p>
              )}
            </div>
          )}

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="mov-data">Data</Label>
            <Input
              id="mov-data"
              type="date"
              aria-required="true"
              {...form.register('data')}
            />
            {form.formState.errors.data && (
              <p className="text-sm text-destructive">{form.formState.errors.data.message}</p>
            )}
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="mov-qty">
              Quantidade (toneladas) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mov-qty"
              type="number"
              step="0.1"
              aria-required="true"
              {...form.register('quantidade', { valueAsNumber: true })}
            />
            {form.formState.errors.quantidade && (
              <p className="text-sm text-destructive">{form.formState.errors.quantidade.message}</p>
            )}
          </div>

          {/* Campos condicionais para Venda */}
          {subtipoAtual === 'Venda' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mov-valor">Valor unitário (R$)</Label>
                <Input
                  id="mov-valor"
                  type="number"
                  step="0.01"
                  {...form.register('valor_unitario', { valueAsNumber: true })}
                />
                {form.formState.errors.valor_unitario && (
                  <p className="text-sm text-destructive">{form.formState.errors.valor_unitario.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov-comprador">Comprador</Label>
                <Input
                  id="mov-comprador"
                  maxLength={150}
                  {...form.register('comprador')}
                />
              </div>
            </>
          )}

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="mov-resp">Responsável</Label>
            <Input id="mov-resp" {...form.register('responsavel')} />
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="mov-obs">Observações</Label>
            <Input id="mov-obs" {...form.register('observacao')} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || checandoEntrada}>
              {form.formState.isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
