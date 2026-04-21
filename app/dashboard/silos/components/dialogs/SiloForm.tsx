'use client';

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { siloSchema, type SiloInput, TIPOS_SILO } from '@/lib/validations/silos';
import { type Silo, type Talhao, type Insumo } from '@/lib/supabase';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';

interface SiloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  silo?: Silo;
  talhoes: Talhao[];
  insumos: Insumo[];
  onSuccess: () => void;
}

function calcularDensidade(
  comprimento: number | null | undefined,
  largura: number | null | undefined,
  altura: number | null | undefined,
  volume: number | null | undefined
): number | null {
  if (!comprimento || !largura || !altura || !volume) return null;
  const volumeGeom = comprimento * largura * altura;
  if (volumeGeom <= 0) return null;
  return (volume * 1000) / volumeGeom;
}

function getDensidadeBadge(densidade: number | null) {
  if (densidade === null) return null;
  if (densidade >= 650) return { label: `🟢 ${densidade.toFixed(0)} kg/m³`, cls: 'text-green-700' };
  if (densidade >= 550) return { label: `🟡 ${densidade.toFixed(0)} kg/m³`, cls: 'text-yellow-700' };
  return { label: `🔴 ${densidade.toFixed(0)} kg/m³`, cls: 'text-red-700' };
}

export function SiloForm({
  open,
  onOpenChange,
  mode,
  silo,
  talhoes,
  insumos,
  onSuccess,
}: SiloFormProps) {
  const form = useForm<SiloInput>({
    resolver: zodResolver(siloSchema),
    defaultValues: silo
      ? {
          nome: silo.nome,
          tipo: silo.tipo,
          volume_ensilado_ton_mv: silo.volume_ensilado_ton_mv ?? undefined,
          comprimento_m: silo.comprimento_m ?? undefined,
          largura_m: silo.largura_m ?? undefined,
          altura_m: silo.altura_m ?? undefined,
          cultura_ensilada: silo.cultura_ensilada ?? '',
          materia_seca_percent: silo.materia_seca_percent ?? null,
          talhao_id: silo.talhao_id ?? null,
          data_fechamento: silo.data_fechamento ?? undefined,
          data_abertura_prevista: silo.data_abertura_prevista ?? undefined,
          data_abertura_real: silo.data_abertura_real ?? undefined,
          observacoes_gerais: silo.observacoes_gerais ?? '',
          custo_aquisicao_rs_ton: silo.custo_aquisicao_rs_ton ?? null,
          insumo_lona_id: silo.insumo_lona_id ?? null,
          insumo_inoculante_id: silo.insumo_inoculante_id ?? null,
        }
      : {
          nome: '',
          tipo: 'Trincheira',
          volume_ensilado_ton_mv: undefined,
          comprimento_m: undefined,
          largura_m: undefined,
          altura_m: undefined,
          cultura_ensilada: '',
          materia_seca_percent: null,
          talhao_id: null,
          data_fechamento: undefined,
          data_abertura_prevista: undefined,
          data_abertura_real: undefined,
          observacoes_gerais: '',
          custo_aquisicao_rs_ton: null,
          insumo_lona_id: null,
          insumo_inoculante_id: null,
        },
  });

  // Reset form when dialog opens in create mode
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && mode === 'create') {
      form.reset({
        nome: '',
        tipo: 'Trincheira',
        volume_ensilado_ton_mv: undefined,
        comprimento_m: undefined,
        largura_m: undefined,
        altura_m: undefined,
        cultura_ensilada: '',
        materia_seca_percent: null,
        talhao_id: null,
        data_fechamento: undefined,
        data_abertura_prevista: undefined,
        observacoes_gerais: '',
        custo_aquisicao_rs_ton: null,
        insumo_lona_id: null,
        insumo_inoculante_id: null,
      });
    }
  }, [open]);

  const comprimento = form.watch('comprimento_m');
  const largura = form.watch('largura_m');
  const altura = form.watch('altura_m');
  const volumeWatch = form.watch('volume_ensilado_ton_mv');
  const talhaoId = form.watch('talhao_id');
  const dataFechamento = form.watch('data_fechamento');

  // Auto-preenche data_abertura_prevista com +60 dias quando data_fechamento muda
  useEffect(() => {
    if (!dataFechamento) return;
    const dataAberturaAtual = form.getValues('data_abertura_prevista');
    if (dataAberturaAtual) return; // não sobrescreve se já preenchido
    const d = new Date(dataFechamento + 'T00:00:00');
    d.setDate(d.getDate() + 60);
    form.setValue('data_abertura_prevista', d.toISOString().slice(0, 10));
  }, [dataFechamento]); // eslint-disable-line react-hooks/exhaustive-deps

  const densidade = calcularDensidade(comprimento, largura, altura, volumeWatch);
  const densidadeBadge = getDensidadeBadge(densidade);
  const showCustoAquisicao = !talhaoId;

  const handleSubmit = async (data: SiloInput) => {
    if (mode === 'create' && !data.data_fechamento) {
      form.setError('data_fechamento', { message: 'Data de fechamento é obrigatória' });
      return;
    }
    if (mode === 'create' && (!data.volume_ensilado_ton_mv || data.volume_ensilado_ton_mv <= 0)) {
      form.setError('volume_ensilado_ton_mv', { message: 'Volume é obrigatório para criar um silo' });
      return;
    }

    try {
      const payload = {
        nome: data.nome,
        tipo: data.tipo,
        volume_ensilado_ton_mv: data.volume_ensilado_ton_mv ?? null,
        comprimento_m: data.comprimento_m ?? null,
        largura_m: data.largura_m ?? null,
        altura_m: data.altura_m ?? null,
        cultura_ensilada: data.cultura_ensilada || null,
        materia_seca_percent: data.materia_seca_percent ?? null,
        talhao_id: data.talhao_id || null,
        data_fechamento: data.data_fechamento ?? null,
        data_abertura_prevista: data.data_abertura_prevista ?? null,
        data_abertura_real: data.data_abertura_real ?? null,
        observacoes_gerais: data.observacoes_gerais || null,
        custo_aquisicao_rs_ton: showCustoAquisicao ? (data.custo_aquisicao_rs_ton ?? null) : null,
        insumo_lona_id: data.insumo_lona_id || null,
        insumo_inoculante_id: data.insumo_inoculante_id || null,
      };

      if (mode === 'create') {
        const novoSilo = await q.silos.create({ ...payload, fazenda_id: '' });

        // Criação atômica: movimentação de entrada obrigatória
        try {
          await q.movimentacoesSilo.create({
            silo_id: novoSilo.id,
            tipo: 'Entrada',
            subtipo: 'Ensilagem',
            quantidade: data.volume_ensilado_ton_mv!,
            data: data.data_fechamento!,
            responsavel: 'Sistema',
            observacao: 'Entrada gerada automaticamente no cadastro do silo',
            talhao_id: null,
          });
        } catch {
          // Reverter silo criado — a movimentação de entrada não foi criada
          try {
            await q.silos.remove(novoSilo.id);
          } catch {
            // ignore rollback error, orphan silo será detectável manualmente
          }
          toast.error('Erro ao criar silo. Tente novamente.');
          return; // manter dialog aberto
        }

        // Integração opcional com insumos (não reverte silo se falhar)
        if (data.insumo_lona_id || data.insumo_inoculante_id) {
          try {
            if (data.insumo_lona_id) {
              const insumoLona = await q.insumos.getById(data.insumo_lona_id);
              await q.movimentacoesInsumo.create({
                insumo_id: data.insumo_lona_id,
                tipo: 'Saída',
                quantidade: 1,
                valor_unitario: insumoLona.custo_medio,
                tipo_saida: 'USO_INTERNO',
                destino_tipo: 'silo',
                destino_id: novoSilo.id,
                origem: 'silo',
                data: new Date().toISOString().split('T')[0],
                observacoes: `Lona para silo: ${data.nome}`,
              } as any);
            }

            if (data.insumo_inoculante_id) {
              const insumoInoc = await q.insumos.getById(data.insumo_inoculante_id);
              const quantidade = data.volume_ensilado_ton_mv
                ? data.volume_ensilado_ton_mv / 1000
                : 1;
              if (insumoInoc.estoque_atual < quantidade) {
                throw new Error(
                  `Estoque insuficiente de ${insumoInoc.nome}. Disponível: ${insumoInoc.estoque_atual} ${insumoInoc.unidade}`
                );
              }
              await q.movimentacoesInsumo.create({
                insumo_id: data.insumo_inoculante_id,
                tipo: 'Saída',
                quantidade,
                valor_unitario: insumoInoc.custo_medio,
                tipo_saida: 'USO_INTERNO',
                destino_tipo: 'silo',
                destino_id: novoSilo.id,
                origem: 'silo',
                data: new Date().toISOString().split('T')[0],
                observacoes: `Inoculante para silo: ${data.nome} (${data.volume_ensilado_ton_mv} ton MV)`,
              } as any);
            }
          } catch (insumoError) {
            toast.error(
              insumoError instanceof Error ? insumoError.message : 'Erro ao registrar saída de insumo'
            );
            // Silo e entrada já estão confirmados — não reverter
          }
        }

        toast.success('Silo criado com sucesso!');
      } else if (silo) {
        await q.silos.update(silo.id, payload);
        toast.success('Silo atualizado com sucesso!');
      }

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar silo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo Silo' : 'Editar Silo'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Adicione uma nova estrutura de armazenamento.'
              : 'Atualize os dados do silo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Seção A — Dados Gerais */}
          <div className="space-y-2">
            <Label htmlFor="silo-nome">Nome do Silo</Label>
            <Input
              id="silo-nome"
              placeholder="Ex: Silo Norte 01"
              aria-required="true"
              {...form.register('nome')}
            />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="silo-tipo">Tipo de Estrutura</Label>
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="silo-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SILO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="silo-fechamento">
                Data de Fechamento {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="silo-fechamento"
                type="date"
                aria-required={mode === 'create'}
                {...form.register('data_fechamento')}
              />
              {form.formState.errors.data_fechamento && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.data_fechamento.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="silo-abertura-prevista">Abertura Prevista</Label>
              <Input
                id="silo-abertura-prevista"
                type="date"
                {...form.register('data_abertura_prevista')}
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="silo-abertura-real">
                Data de Abertura Real
                {silo?.data_abertura_real && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (auto-registrada na primeira saída)
                  </span>
                )}
              </Label>
              <Input
                id="silo-abertura-real"
                type="date"
                {...form.register('data_abertura_real')}
              />
              {form.formState.errors.data_abertura_real && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.data_abertura_real.message}
                </p>
              )}
            </div>
          )}

          {/* Talhão */}
          <div className="space-y-2">
            <Label htmlFor="silo-talhao">Talhão</Label>
            <Controller
              control={form.control}
              name="talhao_id"
              render={({ field }) => (
                <Select
                  onValueChange={(val) => field.onChange(val === '' ? null : val)}
                  value={field.value ?? ''}
                >
                  <SelectTrigger id="silo-talhao">
                    <SelectValue placeholder="Selecione um talhão (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {talhoes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Cultura Ensilada */}
          <div className="space-y-2">
            <Label htmlFor="silo-cultura">Cultura Ensilada</Label>
            <Input
              id="silo-cultura"
              placeholder="Ex: Milho, Sorgo"
              readOnly={!!talhaoId}
              className={talhaoId ? 'bg-muted cursor-not-allowed' : ''}
              {...form.register('cultura_ensilada')}
            />
            {talhaoId && (
              <p className="text-xs text-muted-foreground">
                Cultura vinculada ao talhão selecionado
              </p>
            )}
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <Label htmlFor="silo-volume">
              Volume Ensilado (ton MV){mode === 'create' && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id="silo-volume"
              type="number"
              step="0.1"
              placeholder="Ex: 150.5"
              {...form.register('volume_ensilado_ton_mv', {
                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
            {form.formState.errors.volume_ensilado_ton_mv && (
              <p className="text-xs text-destructive">
                {form.formState.errors.volume_ensilado_ton_mv.message}
              </p>
            )}
          </div>

          {/* Seção B — Dimensões */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Dimensões (opcional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="silo-comp">Comprimento (m)</Label>
                <Input
                  id="silo-comp"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 10.5"
                  {...form.register('comprimento_m', {
                    setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="silo-larg">Largura (m)</Label>
                <Input
                  id="silo-larg"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5.0"
                  {...form.register('largura_m', {
                    setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="silo-alt">Altura (m)</Label>
                <Input
                  id="silo-alt"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 3.0"
                  {...form.register('altura_m', {
                    setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                  })}
                />
              </div>
            </div>

            {/* Indicador de densidade */}
            {densidadeBadge && (
              <div className={`text-sm font-medium ${densidadeBadge.cls}`}>
                Densidade estimada: {densidadeBadge.label}
                <span className="text-xs text-muted-foreground ml-2">
                  (ideal ≥ 650 kg/m³)
                </span>
              </div>
            )}
          </div>

          {/* Seção C — Qualidade */}
          <div className="space-y-2">
            <Label htmlFor="silo-ms">Matéria Seca (%)</Label>
            <Input
              id="silo-ms"
              type="number"
              step="0.1"
              placeholder="Ex: 32.5"
              {...form.register('materia_seca_percent', {
                setValueAs: (v) => (v === '' ? null : parseFloat(v)),
              })}
            />
          </div>

          {/* Seção D — Custo de aquisição (apenas para silos sem talhão) */}
          {showCustoAquisicao && (
            <div className="space-y-2">
              <Label htmlFor="silo-custo">Custo de aquisição da silagem (R$/ton)</Label>
              <Input
                id="silo-custo"
                type="number"
                step="0.01"
                placeholder="Ex: 180.00"
                {...form.register('custo_aquisicao_rs_ton', {
                  setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                })}
              />
            </div>
          )}

          {/* Insumos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="silo-lona">Lona</Label>
              <Controller
                control={form.control}
                name="insumo_lona_id"
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val === '' ? null : val)}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger id="silo-lona">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {insumos.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="silo-inoc">Inoculante</Label>
              <Controller
                control={form.control}
                name="insumo_inoculante_id"
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val === '' ? null : val)}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger id="silo-inoc">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {insumos.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="silo-obs">Observações Gerais</Label>
            <Textarea
              id="silo-obs"
              placeholder="Informações adicionais sobre o silo..."
              maxLength={1000}
              {...form.register('observacoes_gerais')}
            />
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Salvando...'
                : mode === 'create'
                ? 'Criar Silo'
                : 'Atualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
