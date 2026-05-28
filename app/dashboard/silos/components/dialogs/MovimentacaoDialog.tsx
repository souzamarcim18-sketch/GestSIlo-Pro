'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            {/* Silo (dropdown apenas quando não fixo) */}
            {!siloId && (
              <FormField
                control={form.control}
                name="silo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Silo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o silo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {silos.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!jaTemEntrada && (
                        <SelectItem value="Entrada">Entrada</SelectItem>
                      )}
                      <SelectItem value="Saída">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subtipo — apenas para Saída */}
            {tipoAtual === 'Saída' && (
              <FormField
                control={form.control}
                name="subtipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Subtipo <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino da saída" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBTIPOS_MOVIMENTACAO.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Data */}
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantidade */}
            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantidade (toneladas) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos condicionais para Venda */}
            {subtipoAtual === 'Venda' && (
              <>
                <FormField
                  control={form.control}
                  name="valor_unitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor unitário (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? undefined : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comprador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comprador</FormLabel>
                      <FormControl>
                        <Input maxLength={150} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Responsável */}
            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observação */}
            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
