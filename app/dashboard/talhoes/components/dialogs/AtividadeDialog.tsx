'use client';

import { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { type CicloAgricola } from '@/lib/types/talhoes';
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

const TIPOS_OPERACAO = [
  'Preparo de Solo',
  'Calagem',
  'Gessagem',
  'Plantio',
  'Pulverização',
  'Colheita',
  'Análise de Solo',
  'Irrigação',
];

const atividadeSchema = z.object({
  tipo_operacao: z.string().min(1, 'Tipo de operação é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  maquina_id: z.string().optional(),
  horas_maquina: z.number().optional(),
  observacoes: z.string().optional(),
  custo_manual: z.number().optional(),
  // Preparo de Solo
  tipo_operacao_solo: z.string().optional(),
  // Calagem / Gessagem
  insumo_id: z.string().optional(),
  dose_ton_ha: z.number().optional(),
  // Plantio
  semente_id: z.string().optional(),
  populacao_plantas_ha: z.number().optional(),
  sacos_ha: z.number().optional(),
  espacamento_entre_linhas_cm: z.number().optional(),
  // Pulverização
  categoria_pulverizacao: z.string().optional(),
  dose_valor: z.number().optional(),
  dose_unidade: z.string().optional(),
  volume_calda_l_ha: z.number().optional(),
  // Colheita
  produtividade_ton_ha: z.number().optional(),
  maquina_colheita_id: z.string().optional(),
  horas_colheita: z.number().optional(),
  maquina_transporte_id: z.string().optional(),
  horas_transporte: z.number().optional(),
  maquina_compactacao_id: z.string().optional(),
  horas_compactacao: z.number().optional(),
  valor_terceirizacao_r: z.number().optional(),
  permite_rebrota: z.boolean().optional(),
  // Análise de Solo
  custo_amostra_r: z.number().optional(),
  metodo_entrada: z.string().optional(),
  url_pdf_analise: z.any().optional(),
  ph_cacl2: z.number().optional(),
  mo_g_dm3: z.number().optional(),
  p_mg_dm3: z.number().optional(),
  k_mmolc_dm3: z.number().optional(),
  ca_mmolc_dm3: z.number().optional(),
  mg_mmolc_dm3: z.number().optional(),
  al_mmolc_dm3: z.number().optional(),
  h_al_mmolc_dm3: z.number().optional(),
  s_mg_dm3: z.number().optional(),
  b_mg_dm3: z.number().optional(),
  cu_mg_dm3: z.number().optional(),
  fe_mg_dm3: z.number().optional(),
  mn_mg_dm3: z.number().optional(),
  zn_mg_dm3: z.number().optional(),
  // Irrigação
  lamina_mm: z.number().optional(),
  horas_irrigacao: z.number().optional(),
  custo_por_hora_r: z.number().optional(),
});

type AtividadeInput = z.infer<typeof atividadeSchema>;

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
  const methods = useForm<AtividadeInput>({
    resolver: zodResolver(atividadeSchema),
    defaultValues: {
      tipo_operacao: '',
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
      // Construir dados_json com detalhes específicos de cada tipo de operação
      const dadosJson: any = {};

      // Adicionar campos comuns opcionais
      if (data.maquina_id) dadosJson.maquina_id = data.maquina_id;
      if (data.horas_maquina) dadosJson.horas_maquina = data.horas_maquina;

      // Preparo de Solo
      if (data.tipo_operacao_solo) dadosJson.tipo_operacao_solo = data.tipo_operacao_solo;

      // Calagem / Gessagem
      if (data.insumo_id) dadosJson.insumo_id = data.insumo_id;
      if (data.dose_ton_ha) dadosJson.dose_ton_ha = data.dose_ton_ha;

      // Plantio
      if (data.semente_id) dadosJson.semente_id = data.semente_id;
      if (data.populacao_plantas_ha) dadosJson.populacao_plantas_ha = data.populacao_plantas_ha;
      if (data.sacos_ha) dadosJson.sacos_ha = data.sacos_ha;
      if (data.espacamento_entre_linhas_cm) dadosJson.espacamento_entre_linhas_cm = data.espacamento_entre_linhas_cm;

      // Pulverização
      if (data.categoria_pulverizacao) dadosJson.categoria_pulverizacao = data.categoria_pulverizacao;
      if (data.dose_valor) dadosJson.dose_valor = data.dose_valor;
      if (data.dose_unidade) dadosJson.dose_unidade = data.dose_unidade;
      if (data.volume_calda_l_ha) dadosJson.volume_calda_l_ha = data.volume_calda_l_ha;

      // Colheita
      if (data.produtividade_ton_ha) dadosJson.produtividade_ton_ha = data.produtividade_ton_ha;
      if (data.maquina_colheita_id) dadosJson.maquina_colheita_id = data.maquina_colheita_id;
      if (data.horas_colheita) dadosJson.horas_colheita = data.horas_colheita;
      if (data.maquina_transporte_id) dadosJson.maquina_transporte_id = data.maquina_transporte_id;
      if (data.horas_transporte) dadosJson.horas_transporte = data.horas_transporte;
      if (data.maquina_compactacao_id) dadosJson.maquina_compactacao_id = data.maquina_compactacao_id;
      if (data.horas_compactacao) dadosJson.horas_compactacao = data.horas_compactacao;
      if (data.valor_terceirizacao_r) dadosJson.valor_terceirizacao_r = data.valor_terceirizacao_r;
      if (data.permite_rebrota) dadosJson.permite_rebrota = data.permite_rebrota;

      // Análise de Solo
      if (data.custo_amostra_r) dadosJson.custo_amostra_r = data.custo_amostra_r;
      if (data.metodo_entrada) dadosJson.metodo_entrada = data.metodo_entrada;
      if (data.ph_cacl2) dadosJson.ph_cacl2 = data.ph_cacl2;
      if (data.mo_g_dm3) dadosJson.mo_g_dm3 = data.mo_g_dm3;
      if (data.p_mg_dm3) dadosJson.p_mg_dm3 = data.p_mg_dm3;
      if (data.k_mmolc_dm3) dadosJson.k_mmolc_dm3 = data.k_mmolc_dm3;
      if (data.ca_mmolc_dm3) dadosJson.ca_mmolc_dm3 = data.ca_mmolc_dm3;
      if (data.mg_mmolc_dm3) dadosJson.mg_mmolc_dm3 = data.mg_mmolc_dm3;
      if (data.al_mmolc_dm3) dadosJson.al_mmolc_dm3 = data.al_mmolc_dm3;
      if (data.h_al_mmolc_dm3) dadosJson.h_al_mmolc_dm3 = data.h_al_mmolc_dm3;
      if (data.s_mg_dm3) dadosJson.s_mg_dm3 = data.s_mg_dm3;
      if (data.b_mg_dm3) dadosJson.b_mg_dm3 = data.b_mg_dm3;
      if (data.cu_mg_dm3) dadosJson.cu_mg_dm3 = data.cu_mg_dm3;
      if (data.fe_mg_dm3) dadosJson.fe_mg_dm3 = data.fe_mg_dm3;
      if (data.mn_mg_dm3) dadosJson.mn_mg_dm3 = data.mn_mg_dm3;
      if (data.zn_mg_dm3) dadosJson.zn_mg_dm3 = data.zn_mg_dm3;

      // Irrigação
      if (data.lamina_mm) dadosJson.lamina_mm = data.lamina_mm;
      if (data.horas_irrigacao) dadosJson.horas_irrigacao = data.horas_irrigacao;
      if (data.custo_por_hora_r) dadosJson.custo_por_hora_r = data.custo_por_hora_r;

      const payload: any = {
        ciclo_id: cicloAtivo.id,
        talhao_id: talhaoId,
        tipo_atividade: data.tipo_operacao,
        data_atividade: data.data,
        observacoes: data.observacoes || null,
        custo_total: custoEstimado,
        dados_json: dadosJson,
      };

      const atividade = await q.atividadesCampo.create(payload);
      let criadaAtividadeId = atividade.id;

      // Integração Talhões → Insumos: Se aplicou insumo, criar saída
      if (data.insumo_id && ['Calagem', 'Gessagem', 'Pulverização'].includes(data.tipo_operacao)) {
        try {
          const insumo = await q.insumos.getById(data.insumo_id);
          const quantidade = data.dose_ton_ha ? data.dose_ton_ha * (talhaoAreaHa || 1) : 0;

          if (quantidade > 0) {
            // Validar estoque antes de criar saída
            if (insumo.estoque_atual < quantidade) {
              throw new Error(
                `Estoque insuficiente de ${insumo.nome}. Disponível: ${insumo.estoque_atual} ${insumo.unidade}, Solicitado: ${quantidade}`
              );
            }

            // Criar saída de insumo (integração)
            await q.movimentacoesInsumo.create({
              insumo_id: data.insumo_id,
              tipo: 'Saída',
              quantidade,
              valor_unitario: insumo.custo_medio,
              tipo_saida: 'USO_INTERNO',
              destino_tipo: 'talhao',
              destino_id: talhaoId,
              origem: 'talhao',
              data: data.data,
              observacoes: `Aplicado em atividade: ${data.tipo_operacao}`,
            } as any);
          }
        } catch (insumoError) {
          console.error('Erro ao integrar insumo em talhão:', insumoError);
          // Reverter atividade se falhar integração de insumo
          if (criadaAtividadeId) {
            await q.atividadesCampo.remove(criadaAtividadeId);
          }
          throw insumoError;
        }
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
                  onValueChange={(v) => setValue('tipo_operacao', v as any)}
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
                <PreparoSoloFields control={control} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Calagem' && (
              <div className="border-t pt-4">
                <CalagemFields control={control} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Gessagem' && (
              <div className="border-t pt-4">
                <GessagemFields control={control} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Plantio' && (
              <div className="border-t pt-4">
                <PlantioFields control={control} errors={errors} />
              </div>
            )}

            {tipoOperacao === 'Pulverização' && (
              <div className="border-t pt-4">
                <PulverizacaoFields control={control} errors={errors} watch={watch} />
              </div>
            )}

            {tipoOperacao === 'Colheita' && (
              <div className="border-t pt-4">
                <ColheitaFields
                  control={control}
                  errors={errors}
                  watch={watch}
                  culturaAtiva={cicloAtivo?.cultura}
                />
              </div>
            )}

            {tipoOperacao === 'Análise de Solo' && (
              <div className="border-t pt-4">
                <AnaliseSoloFields control={control} errors={errors} watch={watch} />
              </div>
            )}

            {tipoOperacao === 'Irrigação' && (
              <div className="border-t pt-4">
                <IrrigacaoFields control={control} errors={errors} />
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
                      onValueChange={(v) => setValue('maquina_id', v as any)}
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
                  <p className="text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground">
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
