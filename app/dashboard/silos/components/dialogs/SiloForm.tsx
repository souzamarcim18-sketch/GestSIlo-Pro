'use client';

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
import { type Silo, type Talhao, type Insumo } from '@/lib/supabase';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';

const TIPOS_SILO = ['Bolsa', 'Bunker', 'Convencional'] as const;

const siloSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tipo: z.enum(TIPOS_SILO),
  capacidade: z.number().positive('Capacidade deve ser positiva'),
  localizacao: z.string().optional(),
  materia_seca_percent: z.number().min(0).max(100).nullable().optional(),
  consumo_medio_diario_ton: z.number().min(0).nullable().optional(),
  talhao_id: z.string().nullable().optional(),
  insumo_lona_id: z.string().nullable().optional(),
  insumo_inoculante_id: z.string().nullable().optional(),
});

type SiloFormData = z.infer<typeof siloSchema>;

interface SiloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  silo?: Silo;
  talhoes: Talhao[];
  insumos: Insumo[];
  onSuccess: () => void;
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
  const form = useForm<SiloFormData>({
    resolver: zodResolver(siloSchema),
    defaultValues: silo
      ? {
          nome: silo.nome,
          tipo: silo.tipo as typeof TIPOS_SILO[number],
          capacidade: silo.capacidade,
          localizacao: silo.localizacao || '',
          materia_seca_percent: silo.materia_seca_percent,
          consumo_medio_diario_ton: silo.consumo_medio_diario_ton,
          talhao_id: silo.talhao_id,
          insumo_lona_id: silo.insumo_lona_id,
          insumo_inoculante_id: silo.insumo_inoculante_id,
        }
      : {
          nome: '',
          tipo: 'Bunker',
          capacidade: 0,
          localizacao: '',
          materia_seca_percent: null,
          consumo_medio_diario_ton: null,
          talhao_id: null,
          insumo_lona_id: null,
          insumo_inoculante_id: null,
        },
  });

  const handleSubmit = async (data: SiloFormData) => {
    try {
      if (mode === 'create') {
        await q.silos.create({
          nome: data.nome,
          tipo: data.tipo,
          capacidade: data.capacidade,
          localizacao: data.localizacao || null,
          fazenda_id: '',
          materia_seca_percent: data.materia_seca_percent ?? null,
          consumo_medio_diario_ton: data.consumo_medio_diario_ton ?? null,
          talhao_id: data.talhao_id || null,
          insumo_lona_id: data.insumo_lona_id || null,
          insumo_inoculante_id: data.insumo_inoculante_id || null,
        });
        toast.success('Silo criado com sucesso!');
      } else if (silo) {
        await q.silos.update(silo.id, {
          nome: data.nome,
          tipo: data.tipo,
          capacidade: data.capacidade,
          localizacao: data.localizacao || null,
          materia_seca_percent: data.materia_seca_percent ?? null,
          consumo_medio_diario_ton: data.consumo_medio_diario_ton ?? null,
          talhao_id: data.talhao_id || null,
          insumo_lona_id: data.insumo_lona_id || null,
          insumo_inoculante_id: data.insumo_inoculante_id || null,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Silo' : 'Editar Silo'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Adicione uma nova estrutura de armazenamento.'
              : 'Atualize os dados do silo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Nome */}
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

          {/* Tipo e Capacidade */}
          <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="Bolsa">Bolsa</SelectItem>
                      <SelectItem value="Bunker">Bunker</SelectItem>
                      <SelectItem value="Convencional">Convencional</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="silo-cap">Capacidade (ton)</Label>
              <Input
                id="silo-cap"
                type="number"
                step="0.1"
                aria-required="true"
                {...form.register('capacidade', { valueAsNumber: true })}
              />
              {form.formState.errors.capacidade && (
                <p className="text-xs text-destructive">{form.formState.errors.capacidade.message}</p>
              )}
            </div>
          </div>

          {/* Talhão */}
          <div className="space-y-2">
            <Label htmlFor="silo-talhao">Talhão</Label>
            <Controller
              control={form.control}
              name="talhao_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
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

          {/* MS e Consumo */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="silo-cons">Consumo Diário (ton)</Label>
              <Input
                id="silo-cons"
                type="number"
                step="0.01"
                placeholder="Ex: 1.5"
                {...form.register('consumo_medio_diario_ton', {
                  setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                })}
              />
            </div>
          </div>

          {/* Insumos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="silo-lona">Lona</Label>
              <Controller
                control={form.control}
                name="insumo_lona_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
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

          {/* Localização */}
          <div className="space-y-2">
            <Label htmlFor="silo-loc">Localização</Label>
            <Input
              id="silo-loc"
              placeholder="Descrição ou coordenadas"
              {...form.register('localizacao')}
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
