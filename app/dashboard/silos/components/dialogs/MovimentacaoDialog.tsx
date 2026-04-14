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
import { movimentacaoSiloSchema, SUBTIPOS_MOVIMENTACAO } from '@/lib/validations/silos';
import type { MovimentacaoSiloInput } from '@/lib/validations/silos';
import type { Silo } from '@/lib/supabase';

interface MovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId?: string;
  onSuccess: () => void;
}

export function MovimentacaoDialog({
  open,
  onOpenChange,
  siloId,
  onSuccess,
}: MovimentacaoDialogProps) {
  const [silos, setSilos] = useState<Silo[]>([]);
  const [loadingSilos, setLoadingSilos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<MovimentacaoSiloInput>({
    resolver: zodResolver(movimentacaoSiloSchema),
    defaultValues: {
      silo_id: siloId || '',
      tipo: 'Entrada',
      subtipo: null,
      quantidade: 0,
      data: new Date().toISOString().split('T')[0],
      talhao_id: null,
      responsavel: '',
      observacao: '',
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

  const tipo = watch('tipo');

  // Fetch silos ao abrir (se sem siloId)
  useEffect(() => {
    if (!open || siloId) return;

    const loadData = async () => {
      try {
        setLoadingSilos(true);
        const silosData = await q.silos.list();
        setSilos(silosData);
      } catch {
        toast.error('Erro ao carregar silos');
      } finally {
        setLoadingSilos(false);
      }
    };

    loadData();
  }, [open, siloId]);

  const onSubmit = async (data: MovimentacaoSiloInput) => {
    try {
      setSubmitting(true);

      // Verificar se é Saída e subtipo é obrigatório
      if (data.tipo === 'Saída' && !data.subtipo) {
        toast.error('Subtipo é obrigatório para saídas');
        return;
      }

      await q.movimentacoesSilo.create({
        silo_id: data.silo_id,
        tipo: data.tipo,
        subtipo: data.subtipo || null,
        quantidade: data.quantidade,
        data: data.data,
        talhao_id: data.talhao_id || null,
        responsavel: data.responsavel || null,
        observacao: data.observacao || null,
      });

      toast.success('Movimentação registrada com sucesso!');
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao registrar movimentação';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>
            Registre uma entrada ou saída de silagem
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Silo (se não fornecido) */}
          {!siloId ? (
            <div>
              <Label htmlFor="silo_id">Silo *</Label>
              <Controller
                name="silo_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={submitting || loadingSilos}
                  >
                    <SelectTrigger id="silo_id">
                      <SelectValue placeholder="Selecione um silo" />
                    </SelectTrigger>
                    <SelectContent>
                      {silos.map((silo) => (
                        <SelectItem key={silo.id} value={silo.id}>
                          {silo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.silo_id && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.silo_id.message}
                </p>
              )}
            </div>
          ) : null}

          {/* Silo (read-only, se fornecido) */}
          {siloId && silos.length > 0 ? (
            <div>
              <Label>Silo</Label>
              <div className="px-3 py-2 bg-gray-100 rounded border">
                <p className="text-sm font-medium">
                  {silos.find((s) => s.id === siloId)?.nome || siloId}
                </p>
              </div>
            </div>
          ) : null}

          {/* Tipo */}
          <div>
            <Label htmlFor="tipo">Tipo *</Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={submitting}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem>
                    <SelectItem value="Saída">Saída</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipo && (
              <p className="text-sm text-red-500 mt-1">{errors.tipo.message}</p>
            )}
          </div>

          {/* Subtipo (apenas se Saída) */}
          {tipo === 'Saída' && (
            <div>
              <Label htmlFor="subtipo">Subtipo *</Label>
              <Controller
                name="subtipo"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={(val) => field.onChange(val || null)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="subtipo">
                      <SelectValue placeholder="Selecione o subtipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBTIPOS_MOVIMENTACAO.map((subtipo) => (
                        <SelectItem key={subtipo} value={subtipo}>
                          {subtipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subtipo && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.subtipo.message}
                </p>
              )}
            </div>
          )}

          {/* Quantidade */}
          <div>
            <Label htmlFor="quantidade">Quantidade (ton) *</Label>
            <Input
              id="quantidade"
              type="number"
              step="0.01"
              placeholder="0"
              {...register('quantidade')}
              disabled={submitting}
            />
            {errors.quantidade && (
              <p className="text-sm text-red-500 mt-1">
                {errors.quantidade.message}
              </p>
            )}
          </div>

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

          {/* Responsável */}
          <div>
            <Label htmlFor="responsavel">Responsável</Label>
            <Input
              id="responsavel"
              placeholder="Nome de quem realizou"
              {...register('responsavel')}
              disabled={submitting}
            />
          </div>

          {/* Observação */}
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Input
              id="observacao"
              placeholder="Notas adicionais"
              {...register('observacao')}
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
