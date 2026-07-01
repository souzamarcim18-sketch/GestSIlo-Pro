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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { siloSchema, type SiloInput, TIPOS_SILO } from '@/lib/validations/silos';
import { type Silo, type Talhao } from '@/lib/supabase';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';
import { cn } from '@/lib/utils';

type InsumoSelect = { id: string; nome: string };

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

/** Faixa de qualidade de densidade — cor semântica do design system, sem emoji. */
function getDensidadeInfo(densidade: number | null) {
  if (densidade === null) return null;
  const valor = `${densidade.toFixed(0)} kg/m³`;
  if (densidade >= 650)
    return { valor, nivel: 'Boa compactação', dot: 'bg-primary', text: 'text-primary' };
  if (densidade >= 550)
    return { valor, nivel: 'Aceitável', dot: 'bg-[color:var(--status-warning)]', text: 'text-[color:var(--status-warning)]' };
  return { valor, nivel: 'Baixa — risco de perdas', dot: 'bg-destructive', text: 'text-destructive' };
}

const EMPTY_CREATE: SiloInput = {
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
};

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
      : EMPTY_CREATE,
  });

  // Reset form when dialog opens in create mode
  useEffect(() => {
    if (open && mode === 'create') {
      form.reset(EMPTY_CREATE);
    }
  }, [open, mode, form]);

  const comprimento = form.watch('comprimento_m');
  const largura = form.watch('largura_m');
  const altura = form.watch('altura_m');
  const volumeWatch = form.watch('volume_ensilado_ton_mv');
  const talhaoId = form.watch('talhao_id');
  const dataFechamento = form.watch('data_fechamento');
  const culturaWatch = form.watch('cultura_ensilada');
  const lonaId = form.watch('insumo_lona_id');
  const lona2Id = form.watch('insumo_lona2_id');
  const inoculanteId = form.watch('insumo_inoculante_id');

  // Modo "Outros" do seletor rápido de cultura: revela campo de texto livre.
  const [culturaLivre, setCulturaLivre] = useState(
    mode === 'edit' && !!silo?.cultura_ensilada
      ? !(CULTURAS_SUGERIDAS as readonly string[]).includes(silo.cultura_ensilada)
      : false
  );

  useEffect(() => {
    if (open && mode === 'create') setCulturaLivre(false);
  }, [open, mode]);

  // No create, abertura prevista é sempre fechamento + 60 dias (prazo mínimo de
  // fermentação) — campo readonly. No edit NÃO sobrescrevemos automaticamente:
  // o usuário pode ter ajustado a previsão de propósito.
  useEffect(() => {
    if (mode !== 'create' || !dataFechamento) return;
    const d = new Date(dataFechamento + 'T00:00:00');
    d.setDate(d.getDate() + 60);
    form.setValue('data_abertura_prevista', d.toISOString().slice(0, 10));
  }, [dataFechamento, mode, form]);

  const densidade = calcularDensidade(comprimento, largura, altura, volumeWatch);
  const densidadeInfo = getDensidadeInfo(densidade);
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
      const payloadComum = {
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
        observacoes_gerais: data.observacoes_gerais || null,
        custo_aquisicao_rs_ton: showCustoAquisicao ? (data.custo_aquisicao_rs_ton ?? null) : null,
        insumo_lona_id: data.insumo_lona_id || null,
        insumo_lona2_id: data.insumo_lona2_id || null,
        insumo_inoculante_id: data.insumo_inoculante_id || null,
      };

      if (mode === 'create') {
        // Cadastro atômico: a RPC criar_silo_com_entrada cria o silo E a entrada
        // de ensilagem numa única transação. Sem risco de silo órfão.
        const novoSilo = await q.silos.createWithEntrada({
          ...payloadComum,
          volume_ensilado_ton_mv: data.volume_ensilado_ton_mv!,
          data_fechamento: data.data_fechamento!,
        });

        // Integração opcional com insumos (não reverte o silo se falhar)
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
                data: hojeLocalISO(),
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
                data: hojeLocalISO(),
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
                data: hojeLocalISO(),
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
        await q.silos.update(silo.id, {
          ...payloadComum,
          data_abertura_real: data.data_abertura_real ?? null,
        });
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
              ? 'Cadastre a estrutura e a silagem armazenada. A entrada de ensilagem é registrada automaticamente.'
              : 'Atualize os dados do silo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Silo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Silo Norte 01" aria-required="true" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de estrutura */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Estrutura</FormLabel>
                  <div
                    role="radiogroup"
                    aria-label="Tipo de estrutura"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    {TIPOS_SILO.map((t) => {
                      const selected = field.value === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(t)}
                          className={cn(
                            'rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                            selected
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-surface text-muted-foreground hover:bg-white/5 hover:text-foreground'
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_fechamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="h-5">
                      Data de Fechamento {mode === 'create' && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        aria-required={mode === 'create'}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_abertura_prevista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="h-5">Abertura Prevista</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        readOnly={mode === 'create'}
                        className={mode === 'create' ? 'bg-muted cursor-not-allowed' : ''}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    {mode === 'create' && (
                      <FormDescription className="text-xs">
                        Calculada: fechamento + 60 dias (fermentação)
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === 'edit' && (
              <FormField
                control={form.control}
                name="data_abertura_real"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Data de Abertura Real
                      {silo?.data_abertura_real && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (auto-registrada na primeira saída)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Talhão */}
            <FormField
              control={form.control}
              name="talhao_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Talhão <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </FormLabel>
                  {talhoes.length > 0 && talhoes.length <= MAX_TALHOES_BOTOES ? (
                    <div role="radiogroup" aria-label="Talhão" className="flex flex-wrap gap-2">
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
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um talhão (opcional)" />
                        </SelectTrigger>
                      </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cultura Ensilada */}
            <FormField
              control={form.control}
              name="cultura_ensilada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultura Ensilada</FormLabel>

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
                              field.onChange(c);
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
                          field.onChange('');
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

                  {(talhaoId || culturaLivre) && (
                    <FormControl>
                      <Input
                        placeholder="Ex: Milheto, Aveia"
                        readOnly={!!talhaoId}
                        className={talhaoId ? 'bg-muted cursor-not-allowed' : ''}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                  )}
                  {talhaoId && (
                    <FormDescription>Cultura vinculada ao talhão selecionado</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Volume */}
            <FormField
              control={form.control}
              name="volume_ensilado_ton_mv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Volume Ensilado (ton MV){mode === 'create' && <span className="text-destructive"> *</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 150.5"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Matéria Seca */}
            <FormField
              control={form.control}
              name="materia_seca_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matéria Seca (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 32.5"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensões e custo (recolhível) */}
            <Accordion className="rounded-lg border border-border">
              <AccordionItem value="dimensoes-custo" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium rounded-lg hover:bg-white/5 hover:no-underline **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-foreground">
                  Dimensões e custo
                  <span className="text-xs text-muted-foreground font-normal ml-2">(opcional)</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-1">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="comprimento_m"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comprimento (m)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Ex: 10.5"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="largura_m"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Largura (m)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Ex: 5.0"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="altura_m"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Altura (m)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Ex: 3.0"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {densidadeInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn('h-2 w-2 rounded-full', densidadeInfo.dot)} aria-hidden="true" />
                        <span className={cn('font-medium', densidadeInfo.text)}>
                          Densidade estimada: {densidadeInfo.valor}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {densidadeInfo.nivel} (ideal ≥ 650 kg/m³)
                        </span>
                      </div>
                    )}
                  </div>

                  {showCustoAquisicao && (
                    <FormField
                      control={form.control}
                      name="custo_aquisicao_rs_ton"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custo de aquisição da silagem (R$/ton)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 180.00"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Insumos — Lonas e Inoculante (oculto no plano free) */}
            {isFree ? (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Vinculação de lonas e inoculantes ao estoque requer o plano{' '}
                <span className="font-semibold text-foreground">Starter</span> ou superior.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Lonas{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      (cobertura + barreira de O₂ opcional)
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Lona principal */}
                    <FormField
                      control={form.control}
                      name="insumo_lona_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Lona de cobertura {mode === 'create' && <span className="text-destructive">*</span>}
                          </FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val === '' ? null : val);
                              if (val === '') form.setValue('quantidade_lona', null);
                            }}
                            value={field.value ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={mode === 'create' ? 'Selecione (obrigatório)' : 'Selecione'}>
                                  {field.value
                                    ? (insumosLona.find((i) => i.id === field.value)?.nome ?? 'Selecione')
                                    : mode === 'create'
                                      ? 'Selecione (obrigatório)'
                                      : 'Nenhuma'}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mode === 'edit' && <SelectItem value="">Nenhuma</SelectItem>}
                              {insumosLona.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {lonaId && (
                            <FormField
                              control={form.control}
                              name="quantidade_lona"
                              render={({ field: qtdField }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-xs text-muted-foreground">Quantidade utilizada</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      placeholder="Ex: 1"
                                      {...qtdField}
                                      value={qtdField.value ?? ''}
                                      onChange={(e) =>
                                        qtdField.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Lona barreira de O₂ */}
                    <FormField
                      control={form.control}
                      name="insumo_lona2_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Barreira de oxigênio <span className="text-xs text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val === '' ? null : val);
                              if (val === '') form.setValue('quantidade_lona2', null);
                            }}
                            value={field.value ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione">
                                  {field.value
                                    ? (insumosLona.find((i) => i.id === field.value)?.nome ?? 'Selecione')
                                    : 'Nenhuma'}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Nenhuma</SelectItem>
                              {insumosLona.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {lona2Id && (
                            <FormField
                              control={form.control}
                              name="quantidade_lona2"
                              render={({ field: qtdField }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-xs text-muted-foreground">Quantidade utilizada</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      placeholder="Ex: 1"
                                      {...qtdField}
                                      value={qtdField.value ?? ''}
                                      onChange={(e) =>
                                        qtdField.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Inoculante */}
                <FormField
                  control={form.control}
                  name="insumo_inoculante_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Inoculante <span className="text-xs text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val === '' ? null : val);
                          if (val === '') form.setValue('quantidade_inoculante', null);
                        }}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione">
                              {field.value
                                ? (insumosInoculante.find((i) => i.id === field.value)?.nome ?? 'Selecione')
                                : 'Nenhum'}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {insumosInoculante.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {inoculanteId && (
                        <FormField
                          control={form.control}
                          name="quantidade_inoculante"
                          render={({ field: qtdField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs text-muted-foreground">Quantidade utilizada</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  placeholder={`Ex: ${volumeWatch ? (volumeWatch / 1000).toFixed(3) : '0.001'}`}
                                  {...qtdField}
                                  value={qtdField.value ?? ''}
                                  onChange={(e) =>
                                    qtdField.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes_gerais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Gerais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o silo..."
                      maxLength={1000}
                      {...field}
                      value={field.value ?? ''}
                    />
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Salvando...'
                  : mode === 'create'
                    ? 'Criar Silo'
                    : 'Atualizar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
