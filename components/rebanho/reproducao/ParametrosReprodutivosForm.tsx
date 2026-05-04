'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  atualizarParametrosReprodutivosSchema,
  type AtualizarParametrosReprodutivosInput,
} from '@/lib/validations/rebanho-reproducao';
import { atualizarParametrosReprodutivosAction } from '@/app/dashboard/rebanho/reproducao/actions';
import type { ParametrosReprodutivosFazenda } from '@/lib/types/rebanho-reproducao';

interface ParametrosReprodutivosFormProps {
  parametros: ParametrosReprodutivosFazenda | null;
  isAdmin: boolean;
}

const fieldConfig = [
  {
    name: 'dias_gestacao' as const,
    label: 'Dias de Gestação',
    description: 'Duração esperada da gestação (dias)',
    min: 270,
    max: 295,
  },
  {
    name: 'dias_seca' as const,
    label: 'Dias em Seca',
    description: 'Período de secagem antes do parto (dias)',
    min: 30,
    max: 90,
  },
  {
    name: 'pve_dias' as const,
    label: 'PVE (Puerpério)',
    description: 'Período voluntário de espera (dias)',
    min: 30,
    max: 120,
  },
  {
    name: 'coberturas_para_repetidora' as const,
    label: 'Coberturas para Repetidora',
    description: 'Número de coberturas sem prenhez para marcar como repetidora',
    min: 2,
    max: 5,
  },
  {
    name: 'janela_repetidora_dias' as const,
    label: 'Janela de Identificação Repetidora',
    description: 'Período em dias para considerar como repetidora (dias)',
    min: 90,
    max: 365,
  },
  {
    name: 'meta_taxa_prenhez_pct' as const,
    label: 'Meta: Taxa de Prenhez',
    description: 'Percentual meta de prenhez (%)',
    min: 50,
    max: 100,
  },
  {
    name: 'meta_psm_dias' as const,
    label: 'Meta: PSM',
    description: 'Meta de Período de Serviço à Concepção (dias)',
    min: 50,
    max: 120,
  },
  {
    name: 'meta_iep_dias' as const,
    label: 'Meta: IEP',
    description: 'Meta de Intervalo Entre Partos (dias)',
    min: 350,
    max: 450,
  },
];

export function ParametrosReprodutivosForm({ parametros, isAdmin }: ParametrosReprodutivosFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AtualizarParametrosReprodutivosInput>({
    resolver: zodResolver(atualizarParametrosReprodutivosSchema),
    defaultValues: parametros || {
      dias_gestacao: 280,
      dias_seca: 60,
      pve_dias: 50,
      coberturas_para_repetidora: 3,
      janela_repetidora_dias: 180,
      meta_taxa_prenhez_pct: 80,
      meta_psm_dias: 80,
      meta_iep_dias: 400,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem atualizar parâmetros');
      return;
    }

    setIsLoading(true);
    try {
      const result = await atualizarParametrosReprodutivosAction(data);
      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }
      toast.success('Parâmetros reprodutivos atualizados com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar parâmetros');
    } finally {
      setIsLoading(false);
    }
  });

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-6 text-center">
          <p className="text-muted-foreground">Apenas administradores podem configurar parâmetros reprodutivos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Parâmetros Reprodutivos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure os parâmetros de gestão reprodutiva da sua fazenda
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {fieldConfig.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <p className="text-xs text-muted-foreground">{field.description}</p>
              <Input
                id={field.name}
                type="number"
                min={field.min}
                max={field.max}
                disabled={isLoading}
                className="h-12"
                {...register(field.name, { valueAsNumber: true })}
              />
              {errors[field.name] && (
                <p className="text-xs text-red-600">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        <Button type="submit" disabled={isLoading} className="h-12 w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Salvando...' : 'Salvar Parâmetros'}
        </Button>
      </form>
    </div>
  );
}
