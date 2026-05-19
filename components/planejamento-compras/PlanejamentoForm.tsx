'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  planejamentoAtividadeSchema,
  type PlanejamentoAtividadeInput,
} from '@/lib/validations/planejamento-compras';
import { TIPOS_OPERACAO } from '@/lib/types/planejamento-compras';
import {
  criarPlanejamentoAction,
  atualizarPlanejamentoAction,
} from '@/app/dashboard/planejamento-compras/actions';
import type { PlanejamentoAtividadeComDetalhes } from '@/lib/types/planejamento-compras';

interface TalhaoOption {
  id: string;
  nome: string;
}

interface CicloOption {
  id: string;
  cultura: string;
}

interface PlanejamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talhoes: TalhaoOption[];
  ciclos?: CicloOption[];
  planejamento?: PlanejamentoAtividadeComDetalhes;
  onSuccess?: () => void;
}

export default function PlanejamentoForm({
  open,
  onOpenChange,
  talhoes,
  ciclos = [],
  planejamento,
  onSuccess,
}: PlanejamentoFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(planejamento);

  const form = useForm<PlanejamentoAtividadeInput>({
    resolver: zodResolver(planejamentoAtividadeSchema),
    defaultValues: {
      talhao_id: '',
      ciclo_id: null,
      tipo_operacao: 'Plantio',
      data_prevista: new Date().toISOString().split('T')[0],
      observacoes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        talhao_id: planejamento?.talhao_id ?? '',
        ciclo_id: planejamento?.ciclo_id ?? null,
        tipo_operacao: planejamento?.tipo_operacao ?? 'Plantio',
        data_prevista: planejamento?.data_prevista ?? new Date().toISOString().split('T')[0],
        observacoes: planejamento?.observacoes ?? '',
      });
    }
  }, [open, planejamento, form]);

  async function onSubmit(data: PlanejamentoAtividadeInput) {
    setSubmitting(true);
    const result = isEditing && planejamento
      ? await atualizarPlanejamentoAction(planejamento.id, data)
      : await criarPlanejamentoAction(data);
    setSubmitting(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? 'Atividade atualizada com sucesso' : 'Atividade criada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    }
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Atividade' : 'Nova Atividade Planejada'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados da atividade planejada.'
              : 'Planeje uma nova atividade de campo e os insumos necessários.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Talhão */}
          <div className="space-y-1">
            <Label htmlFor="talhao_id" className="text-sm">Talhão *</Label>
            <Controller
              control={form.control}
              name="talhao_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="talhao_id">
                    <SelectValue placeholder="Selecione o talhão" />
                  </SelectTrigger>
                  <SelectContent>
                    {talhoes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.talhao_id && (
              <p className="text-xs text-red-400">{errors.talhao_id.message}</p>
            )}
          </div>

          {/* Tipo de Operação */}
          <div className="space-y-1">
            <Label htmlFor="tipo_operacao" className="text-sm">Tipo de Operação *</Label>
            <Controller
              control={form.control}
              name="tipo_operacao"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipo_operacao">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OPERACAO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipo_operacao && (
              <p className="text-xs text-red-400">{errors.tipo_operacao.message}</p>
            )}
          </div>

          {/* Data Prevista */}
          <div className="space-y-1">
            <Label htmlFor="data_prevista" className="text-sm">Data Prevista *</Label>
            <Input
              id="data_prevista"
              type="date"
              {...form.register('data_prevista')}
              className="text-sm"
            />
            {errors.data_prevista && (
              <p className="text-xs text-red-400">{errors.data_prevista.message}</p>
            )}
          </div>

          {/* Ciclo Agrícola (opcional) */}
          {ciclos.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="ciclo_id" className="text-sm">Ciclo Agrícola (opcional)</Label>
              <Controller
                control={form.control}
                name="ciclo_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger id="ciclo_id">
                      <SelectValue placeholder="Nenhum ciclo vinculado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {ciclos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.cultura}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1">
            <Label htmlFor="observacoes" className="text-sm">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Informações adicionais..."
              className="text-sm resize-none"
              rows={3}
              {...form.register('observacoes')}
            />
            {errors.observacoes && (
              <p className="text-xs text-red-400">{errors.observacoes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
