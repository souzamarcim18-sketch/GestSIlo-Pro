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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { siloSchema, type SiloInput, TIPOS_SILO } from '@/lib/validations/silos';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type Silo, type Talhao } from '@/lib/supabase';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import { Layers, Container, Package, Boxes, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type InsumoSelect = { id: string; nome: string };

const TIPO_SILO_META: Record<(typeof TIPOS_SILO)[number], { icon: typeof Layers; descricao: string }> = {
  Superfície: { icon: Layers, descricao: 'Monte ao ar livre' },
  Trincheira: { icon: Container, descricao: 'Escavado no solo' },
  Bag: { icon: Package, descricao: 'Silo bolsa' },
  Outros: { icon: Boxes, descricao: 'Outra estrutura' },
};

// Sugestões de cultura para preenchimento rápido (modo create, sem talhão vinculado)
const CULTURAS_SUGERIDAS = ['Milho', 'Sorgo', 'Capim', 'Trigo'] as const;

// Data local de hoje em YYYY-MM-DD (sem shift de fuso)
function hojeLocalISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Acima desse número de talhões, usa dropdown em vez de botões
const MAX_TALHOES_BOTOES = 6;

interface SiloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  silo?: Silo;
  talhoes: Talhao[];
  insumosLona: InsumoSelect[];
  insumosInoculante: InsumoSelect[];
  onSuccess: () => void;
  isFree?: boolean;
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
  insumosLona,
  insumosInoculante,
  onSuccess,
  isFree = false,
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
          quantidade_lona: null,
          insumo_lona2_id: (silo as Record<string, unknown>).insumo_lona2_id as string | null ?? null,
          quantidade_lona2: null,
          insumo_inoculante_id: silo.insumo_inoculante_id ?? null,
          quantidade_inoculante: null,
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
          data_fechamento: hojeLocalISO(),
          data_abertura_prevista: undefined,
          data_abertura_real: undefined,
          observacoes_gerais: '',
          custo_aquisicao_rs_ton: null,
          insumo_lona_id: null,
          quantidade_lona: null,
          insumo_lona2_id: null,
          quantidade_lona2: null,
          insumo_inoculante_id: null,
          quantidade_inoculante: null,
        },
  });

  // Reset form when dialog opens in create mode
   
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
        data_fechamento: hojeLocalISO(),
        data_abertura_prevista: undefined,
        observacoes_gerais: '',
        custo_aquisicao_rs_ton: null,
        insumo_lona_id: null,
        quantidade_lona: null,
        insumo_lona2_id: null,
        quantidade_lona2: null,
        insumo_inoculante_id: null,
        quantidade_inoculante: null,
      });
    }
  }, [open, mode, form]);

  const comprimento = form.watch('comprimento_m');
  const largura = form.watch('largura_m');
  const altura = form.watch('altura_m');
  const volumeWatch = form.watch('volume_ensilado_ton_mv');
  const talhaoId = form.watch('talhao_id');
  const dataFechamento = form.watch('data_fechamento');
  const culturaWatch = form.watch('cultura_ensilada');

  // Modo "Outros" do seletor rápido de cultura: revela campo de texto livre.
  // Em edit, abre como texto livre se a cultura salva não for uma das sugestões.
  const [culturaLivre, setCulturaLivre] = useState(
    mode === 'edit' && !!silo?.cultura_ensilada
      ? !(CULTURAS_SUGERIDAS as readonly string[]).includes(silo.cultura_ensilada)
      : false
  );

  // Ao abrir em create, reseta o modo de texto livre da cultura
  useEffect(() => {
    if (open && mode === 'create') setCulturaLivre(false);
  }, [open, mode]);

  // No create, abertura prevista é sempre fechamento + 60 dias (prazo mínimo de fermentação)
  // No edit, sobrescreve apenas se o usuário mudar a data de fechamento
  useEffect(() => {
    if (!dataFechamento) return;
    const d = new Date(dataFechamento + 'T00:00:00');
    d.setDate(d.getDate() + 60);
    form.setValue('data_abertura_prevista', d.toISOString().slice(0, 10));
  }, [dataFechamento, form]);

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
    if (mode === 'create' && !isFree && !data.insumo_lona_id) {
      form.setError('insumo_lona_id', { message: 'Lona é obrigatória' });
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
        insumo_lona2_id: data.insumo_lona2_id || null,
        insumo_inoculante_id: data.insumo_inoculante_id || null,
      };

      if (mode === 'create') {
        const novoSilo = await q.silos.create(payload);

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
        if (data.insumo_lona_id || data.insumo_lona2_id || data.insumo_inoculante_id) {
          try {
            if (data.insumo_lona_id) {
              const insumoLona = await q.insumos.getById(data.insumo_lona_id);
              const quantidadeLona = data.quantidade_lona ?? 1;
              await q.movimentacoesInsumo.create({
                insumo_id: data.insumo_lona_id,
                tipo: 'Saída',
                quantidade: quantidadeLona,
                valor_unitario: insumoLona.custo_medio,
                tipo_saida: 'USO_INTERNO',
                destino_tipo: 'silo',
                destino_id: novoSilo.id,
                origem: 'silo',
                data: new Date().toISOString().split('T')[0],
                observacoes: `Lona de cobertura para silo: ${data.nome}`,
              });
            }

            if (data.insumo_lona2_id) {
              const insumoLona2 = await q.insumos.getById(data.insumo_lona2_id);
              const quantidadeLona2 = data.quantidade_lona2 ?? 1;
              await q.movimentacoesInsumo.create({
                insumo_id: data.insumo_lona2_id,
                tipo: 'Saída',
                quantidade: quantidadeLona2,
                valor_unitario: insumoLona2.custo_medio,
                tipo_saida: 'USO_INTERNO',
                destino_tipo: 'silo',
                destino_id: novoSilo.id,
                origem: 'silo',
                data: new Date().toISOString().split('T')[0],
                observacoes: `Lona barreira de oxigênio para silo: ${data.nome}`,
              });
            }

            if (data.insumo_inoculante_id) {
              const insumoInoc = await q.insumos.getById(data.insumo_inoculante_id);
              const quantidade = data.quantidade_inoculante
                ?? (data.volume_ensilado_ton_mv ? data.volume_ensilado_ton_mv / 1000 : 1);
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
              });
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
              <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label id="silo-tipo-label">Tipo de Estrutura</Label>
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-labelledby="silo-tipo-label"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {TIPOS_SILO.map((t) => {
                    const meta = TIPO_SILO_META[t];
                    const Icon = meta.icon;
                    const selected = field.value === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => field.onChange(t)}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                          selected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-surface text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        )}
                      >
                        {selected && (
                          <Check
                            className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary"
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">{t}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{meta.descricao}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="silo-fechamento" className="h-5">
                Data de Fechamento {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="silo-fechamento"
                type="date"
                aria-required={mode === 'create'}
                {...form.register('data_fechamento')}
              />
              {form.formState.errors.data_fechamento && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.data_fechamento.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="silo-abertura-prevista" className="h-5">
                Abertura Prevista
              </Label>
              <Input
                id="silo-abertura-prevista"
                type="date"
                readOnly={mode === 'create'}
                className={mode === 'create' ? 'bg-muted cursor-not-allowed' : ''}
                {...form.register('data_abertura_prevista')}
              />
              {mode === 'create' && (
                <p className="text-xs text-muted-foreground">
                  Calculada: fechamento + 60 dias (fermentação)
                </p>
              )}
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
                <p className="text-sm text-destructive">
                  {form.formState.errors.data_abertura_real.message}
                </p>
              )}
            </div>
          )}

          {/* Talhão */}
          <div className="space-y-2">
            <Label id="silo-talhao-label" htmlFor="silo-talhao">
              Talhão <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Controller
              control={form.control}
              name="talhao_id"
              render={({ field }) =>
                talhoes.length > 0 && talhoes.length <= MAX_TALHOES_BOTOES ? (
                  <div
                    role="radiogroup"
                    aria-labelledby="silo-talhao-label"
                    className="flex flex-wrap gap-2"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!field.value}
                      onClick={() => field.onChange(null)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        !field.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      )}
                    >
                      Nenhum
                    </button>
                    {talhoes.map((t) => {
                      const selected = field.value === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(t.id)}
                          className={cn(
                            'rounded-md border px-3 py-1.5 text-sm transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                            selected
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-surface text-muted-foreground hover:bg-white/5 hover:text-foreground'
                          )}
                        >
                          {t.nome}
                        </button>
                      );
                    })}
                  </div>
                ) : (
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
                )
              }
            />
          </div>

          {/* Cultura Ensilada */}
          <div className="space-y-2">
            <Label htmlFor="silo-cultura">Cultura Ensilada</Label>

            {/* Seletor rápido de cultura — só quando não há talhão vinculado */}
            {!talhaoId && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Sugestões de cultura">
                {CULTURAS_SUGERIDAS.map((c) => {
                  const selected = !culturaLivre && culturaWatch === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setCulturaLivre(false);
                        form.setValue('cultura_ensilada', c, { shouldValidate: true });
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        selected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={culturaLivre}
                  onClick={() => {
                    setCulturaLivre(true);
                    form.setValue('cultura_ensilada', '', { shouldValidate: true });
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    culturaLivre
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-surface text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  )}
                >
                  Outros
                </button>
              </div>
            )}

            {/* Campo de texto: sempre visível quando há talhão (readonly) ou quando "Outros" foi escolhido */}
            {(talhaoId || culturaLivre) && (
              <Input
                id="silo-cultura"
                placeholder="Ex: Milheto, Aveia"
                readOnly={!!talhaoId}
                className={talhaoId ? 'bg-muted cursor-not-allowed' : ''}
                {...form.register('cultura_ensilada')}
              />
            )}
            {talhaoId && (
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-destructive">
                {form.formState.errors.volume_ensilado_ton_mv.message}
              </p>
            )}
          </div>

          {/* Seções B/C/D — Dimensões, qualidade e custo (recolhível, opcional) */}
          <Accordion className="border-t border-border">
            <AccordionItem value="dimensoes-qualidade" className="border-b-0">
              <AccordionTrigger className="text-sm font-medium">
                Dimensões e qualidade
                <span className="text-xs text-muted-foreground font-normal ml-2">(opcional)</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                {/* Dimensões */}
                <div className="space-y-3">
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

                {/* Qualidade */}
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

                {/* Custo de aquisição (apenas para silos sem talhão) */}
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Insumos — Lonas e Inoculante (oculto no plano free) */}
          {isFree ? (
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Vinculação de lonas e inoculantes ao estoque requer o plano <span className="font-semibold text-foreground">Starter</span> ou superior.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Lonas <span className="text-xs text-muted-foreground font-normal">(cobertura + barreira de O₂ opcional)</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Lona principal — obrigatória no create */}
                  <div className="space-y-2">
                    <Label htmlFor="silo-lona">
                      Lona de cobertura {mode === 'create' && <span className="text-destructive">*</span>}
                    </Label>
                    <Controller
                      control={form.control}
                      name="insumo_lona_id"
                      render={({ field }) => (
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val === '' ? null : val);
                            if (val === '') form.setValue('quantidade_lona', null);
                          }}
                          value={field.value ?? ''}
                        >
                          <SelectTrigger id="silo-lona">
                            <SelectValue placeholder={mode === 'create' ? 'Selecione (obrigatório)' : 'Selecione'}>
                              {field.value
                                ? (insumosLona.find((i) => i.id === field.value)?.nome ?? 'Selecione')
                                : (mode === 'create' ? 'Selecione (obrigatório)' : 'Nenhuma')}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {mode === 'edit' && <SelectItem value="">Nenhuma</SelectItem>}
                            {insumosLona.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.insumo_lona_id && (
                      <p className="text-sm text-destructive">{form.formState.errors.insumo_lona_id.message}</p>
                    )}
                    {form.watch('insumo_lona_id') && (
                      <div className="space-y-1">
                        <Label htmlFor="silo-qtd-lona" className="text-xs text-muted-foreground">Quantidade utilizada</Label>
                        <Input
                          id="silo-qtd-lona"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Ex: 1"
                          {...form.register('quantidade_lona', {
                            setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                          })}
                        />
                        {form.formState.errors.quantidade_lona && (
                          <p className="text-sm text-destructive">{form.formState.errors.quantidade_lona.message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lona de barreira de O₂ — opcional */}
                  <div className="space-y-2">
                    <Label htmlFor="silo-lona2">
                      Barreira de oxigênio <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Controller
                      control={form.control}
                      name="insumo_lona2_id"
                      render={({ field }) => (
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val === '' ? null : val);
                            if (val === '') form.setValue('quantidade_lona2', null);
                          }}
                          value={field.value ?? ''}
                        >
                          <SelectTrigger id="silo-lona2">
                            <SelectValue placeholder="Selecione">
                              {field.value
                                ? (insumosLona.find((i) => i.id === field.value)?.nome ?? 'Selecione')
                                : 'Nenhuma'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhuma</SelectItem>
                            {insumosLona.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.watch('insumo_lona2_id') && (
                      <div className="space-y-1">
                        <Label htmlFor="silo-qtd-lona2" className="text-xs text-muted-foreground">Quantidade utilizada</Label>
                        <Input
                          id="silo-qtd-lona2"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Ex: 1"
                          {...form.register('quantidade_lona2', {
                            setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                          })}
                        />
                        {form.formState.errors.quantidade_lona2 && (
                          <p className="text-sm text-destructive">{form.formState.errors.quantidade_lona2.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inoculante — opcional */}
              <div className="space-y-2">
                <Label htmlFor="silo-inoc">
                  Inoculante <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Controller
                  control={form.control}
                  name="insumo_inoculante_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val === '' ? null : val);
                        if (val === '') form.setValue('quantidade_inoculante', null);
                      }}
                      value={field.value ?? ''}
                    >
                      <SelectTrigger id="silo-inoc">
                        <SelectValue placeholder="Selecione">
                          {field.value
                            ? (insumosInoculante.find((i) => i.id === field.value)?.nome ?? 'Selecione')
                            : 'Nenhum'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {insumosInoculante.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.watch('insumo_inoculante_id') && (
                  <div className="space-y-1">
                    <Label htmlFor="silo-qtd-inoc" className="text-xs text-muted-foreground">Quantidade utilizada</Label>
                    <Input
                      id="silo-qtd-inoc"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={`Ex: ${form.watch('volume_ensilado_ton_mv') ? ((form.watch('volume_ensilado_ton_mv') ?? 0) / 1000).toFixed(3) : '0.001'}`}
                      {...form.register('quantidade_inoculante', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                    {form.formState.errors.quantidade_inoculante && (
                      <p className="text-sm text-destructive">{form.formState.errors.quantidade_inoculante.message}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

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
