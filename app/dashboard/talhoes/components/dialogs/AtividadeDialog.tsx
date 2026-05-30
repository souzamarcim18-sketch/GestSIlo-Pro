'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider, type FieldValues, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import { type CicloAgricola, TipoOperacao, CategoriaPulverizacao } from '@/lib/types/talhoes';
import type { Insumo } from '@/lib/supabase';
import { AtividadeCampoSchema, type AtividadeCampoInput as AtividadeCampoInputType } from '@/lib/validators/atividades-campo';
import {
  PreparoSoloFields,
  CalagemFields,
  GessagemFields,
  PlantioFields,
  PulverizacaoFields,
  ColheitaFields,
  AnaliseSoloFields,
  IrrigacaoFields,
} from './fields';
import { ColaboradorSelect } from '@/components/ColaboradorSelect';
import { criarAtividadeCampoAction } from '@/app/dashboard/talhoes/actions';

const TIPOS_OPERACAO = Object.values(TipoOperacao);

type AtividadeInput = AtividadeCampoInputType;

interface AtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talhaoId: string;
  talhaoAreaHa?: number;
  cicloAtivo?: CicloAgricola;
  onSuccess?: () => void;
}

export function AtividadeDialog({
  open,
  onOpenChange,
  talhaoId,
  talhaoAreaHa = 1,
  cicloAtivo,
  onSuccess,
}: AtividadeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sementes, setSementes] = useState<Insumo[]>([]);

  useEffect(() => {
    if (!open) return;
    q.categorias.list().then((cats) => {
      const catSemente = cats.find((c) =>
        c.nome.toLowerCase().includes('sement')
      );
      if (!catSemente) return;
      q.insumos.list({ categoria_id: catSemente.id }).then(setSementes);
    });
  }, [open]);
  const methods = useForm<AtividadeInput>({
    resolver: zodResolver(AtividadeCampoSchema),
    defaultValues: {
      tipo_operacao: '' as TipoOperacao,
      data: new Date().toISOString().split('T')[0],
      observacoes: '',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = methods;

  const tipoOperacao = watch('tipo_operacao');
  const custoManual = watch('custo_manual');
  const horasIrrigacao = watch('horas_irrigacao');
  const custoPorHoraIrrigacao = watch('custo_por_hora_r');
  const valorTerceirizacao = watch('valor_terceirizacao_r');

  // Cálculo de custo em tempo real
  const custoEstimado = useMemo(() => {
    if (custoManual && custoManual > 0) return custoManual;

    let custo = 0;
    if (tipoOperacao === 'Irrigação' && horasIrrigacao && custoPorHoraIrrigacao) {
      custo = horasIrrigacao * custoPorHoraIrrigacao;
    } else if (tipoOperacao === 'Colheita' && valorTerceirizacao) {
      custo = valorTerceirizacao;
    }

    return custo;
  }, [tipoOperacao, custoManual, horasIrrigacao, custoPorHoraIrrigacao, valorTerceirizacao]);

  const onSubmit = async (data: AtividadeInput) => {
    if (!cicloAtivo) {
      toast.error('Nenhum ciclo agrícola ativo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await criarAtividadeCampoAction(data, {
        cicloId: cicloAtivo.id,
        talhaoId,
        talhaoAreaHa: talhaoAreaHa || 1,
        talhaoNome: cicloAtivo.cultura,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Gerar eventos DAP automaticamente ao registrar Plantio
      if (data.tipo_operacao === 'Plantio') {
        try {
          const eventosCount = await q.eventosDAP.generate(
            cicloAtivo.id,
            cicloAtivo.cultura,
            cicloAtivo.data_plantio
          );
          toast.success(`Atividade registrada. ${eventosCount} eventos DAP gerados para o calendário.`);
        } catch (error) {
          console.error('Erro ao gerar eventos DAP:', error);
          toast.success('Atividade registrada.');
        }
      } else {
        toast.success('Atividade registrada com sucesso!');
      }

      // Gerar eventos de rebrota ao registrar Colheita de Sorgo Silagem
      if (data.tipo_operacao === 'Colheita' && cicloAtivo.cultura === 'Sorgo Silagem' && data.permite_rebrota) {
        try {
          await q.eventosDAP.generateRebrota(cicloAtivo.id, cicloAtivo.cultura, data.data);
          toast.success('Colheita registrada. Eventos de rebrota gerados.');
        } catch (error) {
          console.error('Erro ao gerar eventos de rebrota:', error);
        }
      }

      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao registrar atividade'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!cicloAtivo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Atividade</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Crie um ciclo agrícola antes de registrar atividades.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Atividade de Campo</DialogTitle>
          <DialogDescription>
            Documente as operações técnicas realizadas.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Campos Comuns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_operacao">Tipo de Operação</Label>
                <Select
                  value={tipoOperacao || ''}
                  onValueChange={(v) => setValue('tipo_operacao', v as TipoOperacao)}
                >
                  <SelectTrigger id="tipo_operacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OPERACAO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_operacao && (
                  <p className="text-sm text-destructive">
                    {errors.tipo_operacao.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" {...register('data')} />
                {errors.data && (
                  <p className="text-sm text-destructive">
                    {errors.data.message}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-componentes Dinâmicos */}
            {tipoOperacao === 'Preparo de Solo' && (
              <div className="border-t pt-4">
                <PreparoSoloFields control={control as unknown as Control<FieldValues>} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Calagem' && (
              <div className="border-t pt-4">
                <CalagemFields control={control as unknown as Control<FieldValues>} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Gessagem' && (
              <div className="border-t pt-4">
                <GessagemFields control={control as unknown as Control<FieldValues>} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Plantio' && (
              <div className="border-t pt-4">
                <PlantioFields control={control as unknown as Control<FieldValues>} errors={errors} sementes={sementes} />
              </div>
            )}

            {tipoOperacao === 'Pulverização' && (
              <div className="border-t pt-4">
                <PulverizacaoFields control={control as unknown as Control<FieldValues>} errors={errors} watch={watch} />
              </div>
            )}

            {tipoOperacao === 'Colheita' && (
              <div className="border-t pt-4">
                <ColheitaFields
                  control={control as unknown as Control<FieldValues>}
                  errors={errors}
                  watch={watch}
                  culturaAtiva={cicloAtivo?.cultura}
                />
              </div>
            )}

            {tipoOperacao === 'Análise de Solo' && (
              <div className="border-t pt-4">
                <AnaliseSoloFields control={control as unknown as Control<FieldValues>} errors={errors} watch={watch} />
              </div>
            )}

            {tipoOperacao === 'Irrigação' && (
              <div className="border-t pt-4">
                <IrrigacaoFields control={control as unknown as Control<FieldValues>} errors={errors} />
              </div>
            )}

            {/* Máquina/Trator e Horas Comuns (se relevante) */}
            {['Preparo de Solo', 'Plantio', 'Pulverização'].includes(
              tipoOperacao
            ) && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium text-sm">Maquinário Adicional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maquina_id">Máquina/Trator</Label>
                    <Select
                      value={watch('maquina_id') || ''}
                      onValueChange={(v) => setValue('maquina_id', v || null)}
                    >
                      <SelectTrigger id="maquina_id">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horas_maquina">Horas Máquina</Label>
                    <Input
                      id="horas_maquina"
                      type="number"
                      step="0.1"
                      placeholder="0.00"
                      {...register('horas_maquina', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Custo Manual e Total Estimado */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Custos</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custo_manual">Custo Manual (R$)</Label>
                  <Input
                    id="custo_manual"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('custo_manual', { valueAsNumber: true })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Preencha se quiser informar manualmente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custo_estimado">Custo Total Estimado (R$)</Label>
                  <Input
                    id="custo_estimado"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={custoEstimado.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Atualizado em tempo real
                  </p>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                placeholder="Detalhes adicionais..."
                {...register('observacoes')}
              />
            </div>

            {/* Responsável */}
            <div className="space-y-2">
              <Label>Executado por</Label>
              <ColaboradorSelect
                value={watch('colaborador_id') ?? undefined}
                onChange={(v) => setValue('colaborador_id', v)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
