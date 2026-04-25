'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const TIPOS_MAQUINA = [
  'Trator',
  'Ensiladeira',
  'Colheitadeira',
  'Pulverizador',
  'Plantadeira/Semeadora',
  'Implemento',
  'Caminhão',
  'Outros',
] as const;

const STATUS_MAQUINA = ['Ativo', 'Em manutenção', 'Parado', 'Vendido'] as const;

const maquinaSchema = z
  .object({
    // Dados Básicos
    nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    tipo: z.enum(TIPOS_MAQUINA),
    status: z.enum(STATUS_MAQUINA).optional(),
    // Identificação
    marca: z.string().optional(),
    modelo: z.string().optional(),
    ano: z.number().int().min(1900).max(2100).nullable().optional(),
    identificacao: z.string().optional(),
    numero_serie: z.string().optional(),
    placa: z.string().optional(),
    // Operação
    consumo_medio_lh: z.number().min(0).nullable().optional(),
    potencia_cv: z.number().min(0).nullable().optional(),
    horimetro_atual: z.number().min(0).nullable().optional(),
    // Implemento
    largura_trabalho_metros: z.number().min(0).nullable().optional(),
    // Aquisição e Depreciação
    valor_aquisicao: z.number().min(0).nullable().optional(),
    data_aquisicao: z.string().nullable().optional(),
    vida_util_anos: z.number().int().min(1).optional(),
    valor_residual: z.number().min(0).nullable().optional(),
    vida_util_horas: z.number().min(0).nullable().optional(),
  })
  .refine(
    (d) => d.tipo !== 'Trator' || (d.consumo_medio_lh != null && d.consumo_medio_lh > 0),
    { message: 'Consumo médio é obrigatório para Tratores', path: ['consumo_medio_lh'] }
  );

type MaquinaFormData = z.infer<typeof maquinaSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface MaquinaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquina?: Maquina;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Section header helper
// ---------------------------------------------------------------------------
function SectionHeader({ label }: { label: string }) {
  return (
    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm font-semibold hover:bg-muted/60 transition-colors">
      <span>{label}</span>
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
    </CollapsibleTrigger>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MaquinaDialog({ open, onOpenChange, maquina, onSuccess }: MaquinaDialogProps) {
  const isEditing = !!maquina;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MaquinaFormData>({
    resolver: zodResolver(maquinaSchema),
    defaultValues: {
      nome: '',
      tipo: 'Trator',
      status: 'Ativo',
      marca: '',
      modelo: '',
      ano: null,
      identificacao: '',
      numero_serie: '',
      placa: '',
      consumo_medio_lh: null,
      potencia_cv: null,
      horimetro_atual: null,
      largura_trabalho_metros: null,
      valor_aquisicao: null,
      data_aquisicao: null,
      vida_util_anos: 10,
      valor_residual: null,
      vida_util_horas: null,
    },
  });

  const tipoWatch = watch('tipo');
  const isImplemento = tipoWatch === 'Implemento';

  // Preencher formulário ao editar
  useEffect(() => {
    if (maquina) {
      reset({
        nome: maquina.nome,
        tipo: maquina.tipo,
        status: maquina.status ?? 'Ativo',
        marca: maquina.marca ?? '',
        modelo: maquina.modelo ?? '',
        ano: maquina.ano ?? null,
        identificacao: maquina.identificacao ?? '',
        numero_serie: maquina.numero_serie ?? '',
        placa: maquina.placa ?? '',
        consumo_medio_lh: maquina.consumo_medio_lh ?? null,
        potencia_cv: maquina.potencia_cv ?? null,
        horimetro_atual: maquina.horimetro_atual ?? null,
        largura_trabalho_metros: maquina.largura_trabalho_metros ?? null,
        valor_aquisicao: maquina.valor_aquisicao ?? null,
        data_aquisicao: maquina.data_aquisicao ?? null,
        vida_util_anos: maquina.vida_util_anos ?? 10,
        valor_residual: maquina.valor_residual ?? null,
        vida_util_horas: maquina.vida_util_horas ?? null,
      });
    }
  }, [maquina, reset]);

  const onSubmit = async (data: MaquinaFormData) => {
    try {
      const payload = {
        nome: data.nome,
        tipo: data.tipo,
        status: data.status ?? 'Ativo',
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ?? null,
        identificacao: data.identificacao || null,
        numero_serie: data.numero_serie || null,
        placa: data.placa || null,
        consumo_medio_lh: data.consumo_medio_lh ?? null,
        potencia_cv: data.potencia_cv ?? null,
        horimetro_atual: data.horimetro_atual ?? null,
        largura_trabalho_metros: data.largura_trabalho_metros ?? null,
        valor_aquisicao: data.valor_aquisicao ?? null,
        data_aquisicao: data.data_aquisicao || null,
        vida_util_anos: data.vida_util_anos ?? 10,
        valor_residual: data.valor_residual ?? null,
        vida_util_horas: data.vida_util_horas ?? null,
      };

      if (isEditing && maquina) {
        await q.maquinas.update(maquina.id, payload);
        toast.success('Máquina atualizada com sucesso!');
      } else {
        await q.maquinas.create(payload as any);
        toast.success('Máquina cadastrada com sucesso!');
      }

      reset();
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar máquina');
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Máquina' : 'Cadastrar Nova Máquina'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do equipamento.'
              : 'Adicione um novo equipamento à frota.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">

          {/* ── Seção: Dados Básicos ──────────────────────────────────────── */}
          <Collapsible defaultOpen>
            <SectionHeader label="Dados Básicos" />
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maq-nome">Nome / Identificação *</Label>
                  <Input
                    id="maq-nome"
                    placeholder="Ex: Trator JD 01"
                    aria-required="true"
                    {...register('nome')}
                  />
                  {errors.nome && (
                    <p className="text-xs text-destructive">{errors.nome.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maq-tipo">Tipo *</Label>
                  <Controller
                    control={control}
                    name="tipo"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="maq-tipo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_MAQUINA.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maq-status">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? 'Ativo'}>
                      <SelectTrigger id="maq-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_MAQUINA.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Seção: Identificação ──────────────────────────────────────── */}
          <Collapsible defaultOpen>
            <SectionHeader label="Identificação" />
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maq-marca">Marca</Label>
                  <Input
                    id="maq-marca"
                    placeholder="Ex: John Deere"
                    {...register('marca')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maq-modelo">Modelo</Label>
                  <Input
                    id="maq-modelo"
                    placeholder="Ex: 6125J"
                    {...register('modelo')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maq-ano">Ano</Label>
                  <Input
                    id="maq-ano"
                    type="number"
                    placeholder="2020"
                    {...register('ano', {
                      setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maq-ident">Patrimônio</Label>
                  <Input
                    id="maq-ident"
                    placeholder="Ex: PAT-001"
                    {...register('identificacao')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maq-placa">Placa</Label>
                  <Input
                    id="maq-placa"
                    placeholder="Ex: ABC-1234"
                    {...register('placa')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maq-serie">Número de Série</Label>
                <Input
                  id="maq-serie"
                  placeholder="Ex: 1RW6125JLKP123456"
                  {...register('numero_serie')}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Seção: Operação (autopropelidos) ─────────────────────────── */}
          {!isImplemento && (
            <Collapsible defaultOpen>
              <SectionHeader label="Operação" />
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-cons">
                      Consumo (L/h){tipoWatch === 'Trator' && ' *'}
                    </Label>
                    <Input
                      id="maq-cons"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      {...register('consumo_medio_lh', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                    {errors.consumo_medio_lh && (
                      <p className="text-xs text-destructive">
                        {errors.consumo_medio_lh.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-pot">Potência (cv)</Label>
                    <Input
                      id="maq-pot"
                      type="number"
                      step="1"
                      placeholder="0"
                      {...register('potencia_cv', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-hor">Horímetro Atual (h)</Label>
                    <Input
                      id="maq-hor"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      {...register('horimetro_atual', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── Seção: Implemento (somente tipo=Implemento) ─────────────── */}
          {isImplemento && (
            <Collapsible defaultOpen>
              <SectionHeader label="Implemento" />
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="maq-largura">Largura de Trabalho (m)</Label>
                  <Input
                    id="maq-largura"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('largura_trabalho_metros', {
                      setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                    })}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── Seção: Aquisição e Depreciação ───────────────────────────── */}
          <Collapsible defaultOpen={false}>
            <SectionHeader label="Aquisição e Depreciação" />
            <CollapsibleContent className="pt-3">
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                  Dados para cálculo de depreciação linear
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-val-aq" className="text-xs">
                      Valor de Aquisição (R$)
                    </Label>
                    <Input
                      id="maq-val-aq"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('valor_aquisicao', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-data-aq" className="text-xs">
                      Data de Aquisição
                    </Label>
                    <Input
                      id="maq-data-aq"
                      type="date"
                      {...register('data_aquisicao', {
                        setValueAs: (v) => (v === '' ? null : v),
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-vida-anos" className="text-xs">
                      Vida Útil (anos)
                    </Label>
                    <Input
                      id="maq-vida-anos"
                      type="number"
                      {...register('vida_util_anos', {
                        setValueAs: (v) => (v === '' ? 10 : parseInt(v, 10)),
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-vida-horas" className="text-xs">
                      Vida Útil (horas)
                    </Label>
                    <Input
                      id="maq-vida-horas"
                      type="number"
                      step="1"
                      placeholder="10000"
                      {...register('vida_util_horas', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-val-res" className="text-xs">
                      Valor Residual (R$)
                    </Label>
                    <Input
                      id="maq-val-res"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('valor_residual', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Salvando...'
                : isEditing
                ? 'Atualizar Máquina'
                : 'Cadastrar Máquina'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
