'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { fecharOcupacaoSchema, type FecharOcupacaoData } from '@/lib/validations/pastagens';
import { fecharOcupacaoAction } from '../actions';
import type { OcupacaoPiqueteComLote } from '@/lib/types/pastagens';

interface FecharOcupacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocupacao: OcupacaoPiqueteComLote;
  onSuccess: () => void;
}

export function FecharOcupacaoDialog({
  open,
  onOpenChange,
  ocupacao,
  onSuccess,
}: FecharOcupacaoDialogProps) {
  const form = useForm<FecharOcupacaoData>({
    resolver: zodResolver(fecharOcupacaoSchema),
    defaultValues: {
      data_saida_real: new Date().toISOString().split('T')[0],
      altura_dossel_saida_cm: undefined,
      observacoes: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: FecharOcupacaoData) {
    const result = await fecharOcupacaoAction(ocupacao.id, data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Ocupação fechada. Piquete voltou para Descanso.');
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <LogOut className="h-4 w-4 text-blue-400" />
            Fechar ocupação
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground">
          Lote: <span className="text-foreground font-medium">{ocupacao.lotes?.nome}</span>
          <span className="ml-3">Entrada: <span className="text-foreground">{new Date(ocupacao.data_entrada).toLocaleDateString('pt-BR')}</span></span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data_saida_real"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Data de saída *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} min={ocupacao.data_entrada} className="bg-[#222] border-white/10 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="altura_dossel_saida_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Altura dossel saída (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Ex: 10"
                      {...field}
                      value={field.value === undefined || field.value === null ? '' : field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      className="bg-[#222] border-white/10 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Condições do pasto na saída..."
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                      className="bg-[#222] border-white/10 text-sm resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">* campos obrigatórios</p>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? 'Fechando...' : 'Fechar ocupação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
