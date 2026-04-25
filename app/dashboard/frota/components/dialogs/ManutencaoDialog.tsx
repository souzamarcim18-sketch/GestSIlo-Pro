'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type Manutencao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const pecaSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória'),
  quantidade: z.number().positive('Quantidade deve ser > 0'),
  valor_unitario: z.number().nonnegative('Valor não pode ser negativo'),
});

const manutencaoSchema = z.object({
  maquina_id: z.string().min(1, 'Selecione uma máquina'),
  tipo: z.enum(['Preventiva', 'Corretiva']),
  status: z.enum(['aberta', 'em andamento', 'concluída']),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  data: z.string().min(1, 'Data é obrigatória'),
  data_prevista: z.string().nullable().optional(),
  data_realizada: z.string().nullable().optional(),
  proxima_manutencao: z.string().nullable().optional(),
  horimetro: z.number().nonnegative('Valor não pode ser negativo').nullable().optional(),
  proxima_manutencao_horimetro: z.number().nonnegative('Valor não pode ser negativo').nullable().optional(),
  responsavel: z.string().optional(),
  mao_de_obra_tipo: z.enum(['própria', 'terceirizada']).nullable().optional(),
  mao_de_obra_valor: z.number().nonnegative('Valor não pode ser negativo').nullable().optional(),
  pecas: z.array(pecaSchema),
});

type ManutencaoFormData = z.infer<typeof manutencaoSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ManutencaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  manutencao?: Manutencao;
  onSuccess: () => void;
  onMaquinaStatusChange?: (maquinaId: string, novoStatus: Maquina['status']) => void;
}

export function ManutencaoDialog({
  open,
  onOpenChange,
  maquinas,
  manutencao,
  onSuccess,
  onMaquinaStatusChange,
}: ManutencaoDialogProps) {
  const isEditing = !!manutencao;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ManutencaoFormData>({
    resolver: zodResolver(manutencaoSchema),
    defaultValues: {
      maquina_id: '',
      tipo: 'Preventiva',
      status: 'aberta',
      descricao: '',
      data: new Date().toISOString().split('T')[0],
      mao_de_obra_tipo: null,
      mao_de_obra_valor: null,
      pecas: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'pecas' });

  // Preencher formulário ao editar
  useEffect(() => {
    if (manutencao) {
      reset({
        maquina_id: manutencao.maquina_id,
        tipo: manutencao.tipo,
        status: manutencao.status ?? 'aberta',
        descricao: manutencao.descricao ?? '',
        data: manutencao.data,
        data_prevista: manutencao.data_prevista ?? null,
        data_realizada: manutencao.data_realizada ?? null,
        proxima_manutencao: manutencao.proxima_manutencao ?? null,
        horimetro: manutencao.horimetro ?? null,
        proxima_manutencao_horimetro: manutencao.proxima_manutencao_horimetro ?? null,
        responsavel: manutencao.responsavel ?? '',
        mao_de_obra_tipo: manutencao.mao_de_obra_tipo ?? null,
        mao_de_obra_valor: manutencao.mao_de_obra_valor ?? null,
        pecas: manutencao.pecas ?? [],
      });
    }
  }, [manutencao, reset]);

  const pecasWatch = watch('pecas');
  const maoDeObraValor = watch('mao_de_obra_valor') ?? 0;
  const tipoWatch = watch('tipo');
  const statusWatch = watch('status');

  // Custo total calculado — nunca aceita valor manual.
  // custo = mao_de_obra_valor + sum(pecas[].quantidade * pecas[].valor_unitario)
  const custoTotal =
    (maoDeObraValor || 0) +
    (pecasWatch ?? []).reduce(
      (acc, p) => acc + (p.quantidade || 0) * (p.valor_unitario || 0),
      0
    );

  // ---------------------------------------------------------------------------
  // Lógica de status automático da máquina
  // ---------------------------------------------------------------------------
  const atualizarStatusMaquina = async (maquinaId: string, novoStatusManutencao: string) => {
    const maquina = maquinas.find((m) => m.id === maquinaId);
    if (!maquina) return;

    if (tipoWatch === 'Corretiva' && novoStatusManutencao === 'em andamento') {
      // Atualizar para "Em manutenção" apenas se o status atual for "Ativo"
      if (maquina.status === 'Ativo') {
        await q.maquinas.update(maquinaId, { status: 'Em manutenção' });
        onMaquinaStatusChange?.(maquinaId, 'Em manutenção');
      }
      return;
    }

    if (novoStatusManutencao === 'concluída') {
      // Verificar se existem outras manutenções abertas/em andamento para esta máquina
      const outras = await q.manutencoes.listByMaquina(maquinaId);
      const abertasOuAndamento = outras.filter(
        (m) =>
          m.id !== manutencao?.id &&
          (m.status === 'aberta' || m.status === 'em andamento')
      );

      // Se houver outras abertas, manter status atual
      if (abertasOuAndamento.length > 0) return;

      // Se status atual for "Em manutenção", reverter para "Ativo"
      if (maquina.status === 'Em manutenção') {
        await q.maquinas.update(maquinaId, { status: 'Ativo' });
        onMaquinaStatusChange?.(maquinaId, 'Ativo');
      }
    }
  };

  const onSubmit = async (data: ManutencaoFormData) => {
    try {
      // Custo sempre recalculado — nunca usa valor manual do form
      const custo =
        (data.mao_de_obra_valor ?? 0) +
        (data.pecas ?? []).reduce(
          (acc, p) => acc + (p.quantidade || 0) * (p.valor_unitario || 0),
          0
        );

      const payload = {
        maquina_id: data.maquina_id,
        tipo: data.tipo,
        status: data.status,
        descricao: data.descricao,
        data: data.data,
        custo,
        data_prevista: data.data_prevista || null,
        data_realizada: data.data_realizada || null,
        proxima_manutencao: data.proxima_manutencao || null,
        horimetro: data.horimetro ?? null,
        proxima_manutencao_horimetro: data.proxima_manutencao_horimetro ?? null,
        responsavel: data.responsavel || null,
        mao_de_obra_tipo: data.mao_de_obra_tipo ?? null,
        mao_de_obra_valor: data.mao_de_obra_valor ?? null,
        pecas: data.pecas.length > 0 ? data.pecas : null,
      };

      if (isEditing && manutencao) {
        await q.manutencoes.update(manutencao.id, payload);
      } else {
        await q.manutencoes.create(payload as any);
      }

      // Atualizar status da máquina conforme regras definidas
      await atualizarStatusMaquina(data.maquina_id, data.status);

      toast.success(isEditing ? 'Manutenção atualizada!' : 'Manutenção registrada!');
      reset();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar manutenção');
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
          <DialogTitle>{isEditing ? 'Editar Manutenção' : 'Nova Manutenção'}</DialogTitle>
          <DialogDescription>
            Registre serviços preventivos ou corretivos para as máquinas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Máquina + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="man-maquina">Máquina *</Label>
              <Controller
                control={control}
                name="maquina_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger id="man-maquina">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinas.map((m) => (
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
              <Label htmlFor="man-tipo">Tipo *</Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="man-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preventiva">Preventiva</SelectItem>
                      <SelectItem value="Corretiva">Corretiva</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Status + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="man-status">Status *</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="man-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em andamento">Em andamento</SelectItem>
                      <SelectItem value="concluída">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="man-data">Data *</Label>
              <Input id="man-data" type="date" {...register('data')} />
              {errors.data && (
                <p className="text-xs text-destructive">{errors.data.message}</p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="man-descricao">Descrição do Serviço *</Label>
            <Input
              id="man-descricao"
              placeholder="Ex: Troca de óleo e filtros"
              {...register('descricao')}
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          {/* Responsável + Horímetro */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="man-resp">Responsável</Label>
              <Input id="man-resp" placeholder="Oficina ou técnico" {...register('responsavel')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="man-hor">Horímetro na Manutenção</Label>
              <Input
                id="man-hor"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...register('horimetro', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
              />
            </div>
          </div>

          {/* Datas prevista / realizada / próxima */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="man-prev" className="text-xs">
                Data Prevista
              </Label>
              <Input id="man-prev" type="date" {...register('data_prevista')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="man-real" className="text-xs">
                Data Realizada
              </Label>
              <Input id="man-real" type="date" {...register('data_realizada')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="man-prox" className="text-xs">
                Próxima Manutenção
              </Label>
              <Input id="man-prox" type="date" {...register('proxima_manutencao')} />
            </div>
          </div>

          {/* Próxima por horímetro */}
          <div className="space-y-2">
            <Label htmlFor="man-prox-hor" className="text-xs">
              Próxima Manutenção (Horímetro)
            </Label>
            <Input
              id="man-prox-hor"
              type="number"
              step="0.1"
              placeholder="Ex: 500"
              {...register('proxima_manutencao_horimetro', {
                setValueAs: (v) => (v === '' ? null : parseFloat(v)),
              })}
            />
          </div>

          {/* Mão de obra */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="man-mob-tipo">Tipo de Mão de Obra</Label>
              <Controller
                control={control}
                name="mao_de_obra_tipo"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                    value={field.value ?? 'none'}
                  >
                    <SelectTrigger id="man-mob-tipo">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      <SelectItem value="própria">Própria</SelectItem>
                      <SelectItem value="terceirizada">Terceirizada</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="man-mob-val">Mão de Obra (R$)</Label>
              <Input
                id="man-mob-val"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('mao_de_obra_valor', {
                  setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                })}
              />
            </div>
          </div>

          {/* Lista de peças */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Peças e Materiais</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ descricao: '', quantidade: 1, valor_unitario: 0 })}
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Peça
              </Button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start">
                    <div>
                      <Input
                        placeholder="Descrição da peça"
                        {...register(`pecas.${index}.descricao`)}
                      />
                      {errors.pecas?.[index]?.descricao && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.pecas[index]?.descricao?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="Qtd"
                        {...register(`pecas.${index}.quantidade`, { valueAsNumber: true })}
                      />
                      {errors.pecas?.[index]?.quantidade && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.pecas[index]?.quantidade?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="R$ unit."
                        {...register(`pecas.${index}.valor_unitario`, { valueAsNumber: true })}
                      />
                      {errors.pecas?.[index]?.valor_unitario && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.pecas[index]?.valor_unitario?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custo Total (readonly — sempre calculado) */}
          <div className="p-4 bg-muted/40 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custo Total Estimado</span>
              <span className="text-lg font-bold">
                R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mão de obra + peças. Calculado automaticamente.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Registrar Manutenção'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
