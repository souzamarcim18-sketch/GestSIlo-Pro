'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider, type FieldValues, type Control, type UseFormSetValue } from 'react-hook-form';
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
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import { type CicloAgricola, TipoOperacao } from '@/lib/types/talhoes';
import type { Insumo, Maquina } from '@/lib/supabase';
import { AtividadeCampoSchema, type AtividadeCampoInput as AtividadeCampoInputType, type AtividadeCampoFormInput } from '@/lib/validators/atividades-campo';
import {
  CalagemFields,
  AdubacaoFields,
  GessagemFields,
  PlantioFields,
  PulverizacaoFields,
  ColheitaFields,
  AnaliseSoloFields,
  IrrigacaoFields,
} from './fields';
import { ColaboradorSelect } from '@/components/ColaboradorSelect';
import { criarAtividadeCampoAction } from '@/app/dashboard/talhoes/actions';
import {
  CULTURAS_SUPORTADAS,
  culturaPossuiDAP,
  culturaPossuiRebrota,
  culturaUsaMudas,
  ehOperacaoColheita,
} from '@/app/dashboard/talhoes/helpers';

const TIPOS_OPERACAO = Object.values(TipoOperacao);

const NENHUMA_MAQUINA = '__none__';

// Operações de preparo de solo — cada uma é um TipoOperacao próprio.
const TIPOS_PREPARO_SOLO: TipoOperacao[] = [
  TipoOperacao.ARACAO,
  TipoOperacao.GRADAGEM,
  TipoOperacao.SUBSOLAGEM,
  TipoOperacao.ESCARIFICACAO,
  TipoOperacao.NIVELAMENTO,
  TipoOperacao.ROCAGEM,
  TipoOperacao.DESTORROAMENTO,
];

// Operações que podem iniciar um ciclo agrícola automaticamente.
const TIPOS_INICIAM_CICLO: TipoOperacao[] = [...TIPOS_PREPARO_SOLO, TipoOperacao.PLANTIO];

// Operações que usam maquinário/trator próprio (com horas-máquina).
const TIPOS_COM_MAQUINARIO: TipoOperacao[] = [
  ...TIPOS_PREPARO_SOLO,
  TipoOperacao.PLANTIO,
  TipoOperacao.PULVERIZACAO,
  TipoOperacao.CALAGEM,
  TipoOperacao.GESSAGEM,
  TipoOperacao.ADUBACAO,
];

type AtividadeInput = AtividadeCampoInputType;

interface AtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talhaoId: string;
  talhaoNome?: string;
  talhaoAreaHa?: number;
  cicloAtivo?: CicloAgricola;
  onSuccess?: () => void;
}

export function AtividadeDialog({
  open,
  onOpenChange,
  talhaoId,
  talhaoNome,
  talhaoAreaHa = 1,
  cicloAtivo,
  onSuccess,
}: AtividadeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sementes, setSementes] = useState<Insumo[]>([]);
  const [mudas, setMudas] = useState<Insumo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      const [allInsumos, allMaquinas, cats] = await Promise.all([
        q.insumos.list(),
        q.maquinas.list(),
        q.categorias.list(),
      ]);
      if (cancelled) return;
      setInsumos(allInsumos);
      setMaquinas(allMaquinas);

      const catSemente = cats.find((c) => c.nome.toLowerCase().includes('sement'));
      const catMuda = cats.find((c) => c.nome.toLowerCase().includes('muda'));
      const [sem, mud] = await Promise.all([
        catSemente ? q.insumos.list({ categoria_id: catSemente.id }) : Promise.resolve([]),
        catMuda ? q.insumos.list({ categoria_id: catMuda.id }) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setSementes(sem);
      setMudas(mud);
    };

    load().catch((e) => console.error('Erro ao carregar opções da atividade:', e));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const methods = useForm<AtividadeCampoFormInput, unknown, AtividadeInput>({
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

  // Cultura do novo ciclo (apenas quando não há ciclo ativo).
  const [culturaNovoCiclo, setCulturaNovoCiclo] = useState<string>('');

  const tipoOperacao = watch('tipo_operacao');
  const maquinaId = watch('maquina_id');
  const horasMaquina = watch('horas_maquina');
  const custoManual = watch('custo_manual');
  const horasIrrigacao = watch('horas_irrigacao');
  const custoPorHoraIrrigacao = watch('custo_por_hora_r');
  const valorTerceirizacao = watch('valor_terceirizacao_r');

  // Quando não há ciclo ativo, só preparo de solo / plantio podem iniciar um.
  const precisaCultura = !cicloAtivo && TIPOS_INICIAM_CICLO.includes(tipoOperacao as TipoOperacao);
  const culturaContexto = cicloAtivo?.cultura ?? culturaNovoCiclo;

  // Culturas vegetativas (cana, capins, tifton) usam mudas em vez de sementes.
  const usaMudas = culturaUsaMudas(culturaContexto);

  // Cálculo de custo em tempo real.
  // Os campos numéricos passam por z.preprocess, então o tipo de entrada do
  // form é `unknown`; coagimos para number aqui antes de qualquer aritmética.
  const custoEstimado = useMemo<number>(() => {
    const custoManualNum = Number(custoManual);
    const horasIrrigacaoNum = Number(horasIrrigacao);
    const custoPorHoraIrrigacaoNum = Number(custoPorHoraIrrigacao);
    const valorTerceirizacaoNum = Number(valorTerceirizacao);
    const horasMaquinaNum = Number(horasMaquina);

    if (custoManualNum > 0) return custoManualNum;

    let custo = 0;
    if (tipoOperacao === 'Irrigação' && horasIrrigacaoNum && custoPorHoraIrrigacaoNum) {
      custo = horasIrrigacaoNum * custoPorHoraIrrigacaoNum;
    } else if (tipoOperacao === 'Colheita' && valorTerceirizacaoNum) {
      custo = valorTerceirizacaoNum;
    } else if (maquinaId && horasMaquinaNum) {
      const maquina = maquinas.find((m) => m.id === maquinaId);
      const custoHora = (maquina as (Maquina & { custo_hora?: number | null }) | undefined)?.custo_hora;
      if (custoHora) custo = horasMaquinaNum * custoHora;
    }

    return custo;
  }, [
    tipoOperacao,
    custoManual,
    horasIrrigacao,
    custoPorHoraIrrigacao,
    valorTerceirizacao,
    maquinaId,
    horasMaquina,
    maquinas,
  ]);

  const onSubmit = async (data: AtividadeInput) => {
    // Sem ciclo ativo: só pode registrar operação que inicia ciclo, com cultura.
    if (!cicloAtivo) {
      if (!TIPOS_INICIAM_CICLO.includes(data.tipo_operacao as TipoOperacao)) {
        toast.error('Registre primeiro um preparo de solo ou plantio para iniciar o ciclo agrícola.');
        return;
      }
      if (!culturaNovoCiclo) {
        toast.error('Selecione a cultura para iniciar o ciclo agrícola.');
        return;
      }
    }

    // Exige horas quando uma máquina própria foi escolhida.
    if (data.maquina_id && !data.horas_maquina) {
      toast.error('Informe as horas-máquina ou deixe o trator em branco e preencha o custo manual.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await criarAtividadeCampoAction(data, {
        cicloId: cicloAtivo?.id ?? null,
        talhaoId,
        talhaoAreaHa: talhaoAreaHa || 1,
        talhaoNome: talhaoNome ?? cicloAtivo?.cultura ?? 'Talhão',
        culturaNovoCiclo: cicloAtivo ? null : culturaNovoCiclo,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const cicloId = result.cicloId;
      const cultura = culturaContexto;
      const dataPlantio = cicloAtivo?.data_plantio ?? data.data;

      // Gerar eventos DAP automaticamente ao registrar Plantio
      if (data.tipo_operacao === 'Plantio' && cicloId && cultura) {
        try {
          const eventosCount = await q.eventosDAP.generate(cicloId, cultura, dataPlantio);
          toast.success(`Atividade registrada. ${eventosCount} eventos DAP gerados para o calendário.`);
        } catch (error) {
          console.error('Erro ao gerar eventos DAP:', error);
          toast.success('Atividade registrada.');
        }
      } else {
        toast.success('Atividade registrada com sucesso!');
      }

      // Gerar eventos de rebrota ao registrar Colheita/Corte de cultura recorrente
      if (
        ehOperacaoColheita(data.tipo_operacao) &&
        cultura &&
        culturaPossuiRebrota(cultura) &&
        data.permite_rebrota &&
        cicloId
      ) {
        try {
          await q.eventosDAP.generateRebrota(cicloId, cultura, data.data);
          toast.success('Colheita registrada. Eventos de rebrota gerados.');
        } catch (error) {
          console.error('Erro ao gerar eventos de rebrota:', error);
        }
      }

      onOpenChange(false);
      reset();
      setCulturaNovoCiclo('');
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

            {/* Cultura — só quando vai iniciar um novo ciclo */}
            {precisaCultura && (
              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="cultura_novo_ciclo">Cultura</Label>
                <Select value={culturaNovoCiclo} onValueChange={(v) => setCulturaNovoCiclo(v ?? '')}>
                  <SelectTrigger id="cultura_novo_ciclo">
                    <SelectValue placeholder="Selecione a cultura" />
                  </SelectTrigger>
                  <SelectContent>
                    {CULTURAS_SUPORTADAS.map((cult) => (
                      <SelectItem key={cult} value={cult}>
                        {cult}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Este registro iniciará um novo ciclo agrícola neste talhão.
                    {culturaNovoCiclo && !culturaPossuiDAP(culturaNovoCiclo) && (
                      <> Esta cultura não possui cronograma de operações automático.</>
                    )}
                  </span>
                </p>
              </div>
            )}

            {/* Aviso quando não há ciclo e a operação não inicia ciclo */}
            {!cicloAtivo && tipoOperacao && !TIPOS_INICIAM_CICLO.includes(tipoOperacao as TipoOperacao) && (
              <Alert>
                <AlertDescription>
                  Registre primeiro um preparo de solo ou plantio para iniciar o ciclo agrícola.
                </AlertDescription>
              </Alert>
            )}

            {/* Sub-componentes Dinâmicos */}
            {tipoOperacao === 'Calagem' && (
              <div className="border-t pt-4">
                <CalagemFields control={control as unknown as Control<FieldValues>} errors={errors} insumos={insumos} watch={watch} />
              </div>
            )}

            {tipoOperacao === 'Adubação' && (
              <div className="border-t pt-4">
                <AdubacaoFields control={control as unknown as Control<FieldValues>} errors={errors} insumos={insumos} watch={watch} />
              </div>
            )}

            {tipoOperacao === 'Gessagem' && (
              <div className="border-t pt-4">
                <GessagemFields control={control as unknown as Control<FieldValues>} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Plantio' && (
              <div className="border-t pt-4">
                <PlantioFields
                  control={control as unknown as Control<FieldValues>}
                  errors={errors}
                  sementes={usaMudas ? mudas : sementes}
                  usaMudas={usaMudas}
                />
              </div>
            )}

            {tipoOperacao === 'Pulverização' && (
              <div className="border-t pt-4">
                <PulverizacaoFields
                  control={control as unknown as Control<FieldValues>}
                  errors={errors}
                  insumos={insumos}
                  watch={watch}
                  setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                />
              </div>
            )}

            {tipoOperacao === 'Colheita' && (
              <div className="border-t pt-4">
                <ColheitaFields
                  control={control as unknown as Control<FieldValues>}
                  errors={errors}
                  maquinas={maquinas}
                  watch={watch}
                  culturaAtiva={culturaContexto}
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

            {/* Máquina/Trator e Horas (operações com maquinário próprio) */}
            {TIPOS_COM_MAQUINARIO.includes(tipoOperacao as TipoOperacao) && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium text-sm">Maquinário</h4>
                <p className="text-sm text-muted-foreground">
                  Escolha o trator/máquina e informe as horas para compor o custo de
                  produção. Ou deixe em branco e informe o custo manualmente abaixo.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maquina_id">Máquina/Trator</Label>
                    <Select
                      value={maquinaId || NENHUMA_MAQUINA}
                      onValueChange={(v) => setValue('maquina_id', v === NENHUMA_MAQUINA ? null : v)}
                    >
                      <SelectTrigger id="maquina_id">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NENHUMA_MAQUINA}>Nenhuma</SelectItem>
                        {maquinas.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
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
                      disabled={!maquinaId}
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
