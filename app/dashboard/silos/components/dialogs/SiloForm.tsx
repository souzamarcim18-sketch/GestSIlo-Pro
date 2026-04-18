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

const TIPOS_SILO = ['Superfície', 'Trincheira', 'Bag', 'Outros'] as const;

const siloSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tipo: z.enum(TIPOS_SILO),
  volume_ensilado_ton_mv: z.number().positive('Volume deve ser positivo').nullable().optional(),
  comprimento_m: z.number().positive('Comprimento deve ser positivo').nullable().optional(),
  largura_m: z.number().positive('Largura deve ser positiva').nullable().optional(),
  altura_m: z.number().positive('Altura deve ser positiva').nullable().optional(),
  cultura_ensilada: z.string().optional(),
  materia_seca_percent: z.number().min(0).max(100).nullable().optional(),
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
          volume_ensilado_ton_mv: silo.volume_ensilado_ton_mv || undefined,
          comprimento_m: silo.comprimento_m || undefined,
          largura_m: silo.largura_m || undefined,
          altura_m: silo.altura_m || undefined,
          cultura_ensilada: silo.cultura_ensilada || '',
          materia_seca_percent: silo.materia_seca_percent,
          talhao_id: silo.talhao_id,
          insumo_lona_id: silo.insumo_lona_id,
          insumo_inoculante_id: silo.insumo_inoculante_id,
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
          insumo_lona_id: null,
          insumo_inoculante_id: null,
        },
  });

  const handleSubmit = async (data: SiloFormData) => {
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
        insumo_lona_id: data.insumo_lona_id || null,
        insumo_inoculante_id: data.insumo_inoculante_id || null,
        data_fechamento: null,
        data_abertura_prevista: null,
        data_abertura_real: null,
        observacoes_gerais: null,
      };

      let siloId: string;

      if (mode === 'create') {
        const siloNovo = await q.silos.create({
          ...payload,
          fazenda_id: '',
        });
        siloId = siloNovo.id;

        // Integração Silos → Insumos: Se adicionou lona/inoculante, criar saídas
        if (data.insumo_lona_id || data.insumo_inoculante_id) {
          try {
            // Saída de Lona
            if (data.insumo_lona_id) {
              const insumoLona = await q.insumos.getById(data.insumo_lona_id);
              await q.movimentacoesInsumo.create({
                insumo_id: data.insumo_lona_id,
                tipo: 'Saída',
                quantidade: 1, // 1 unidade de lona por silo
                valor_unitario: insumoLona.custo_medio,
                tipo_saida: 'USO_INTERNO',
                destino_tipo: 'silo',
                destino_id: siloId,
                origem: 'silo',
                data: new Date().toISOString().split('T')[0],
                observacoes: `Lona para silo: ${data.nome}`,
              } as any);
            }

            // Saída de Inoculante
            if (data.insumo_inoculante_id) {
              const insumoInoc = await q.insumos.getById(data.insumo_inoculante_id);
              // Calcular quantidade de inoculante baseado no volume do silo
              const quantidade = data.volume_ensilado_ton_mv ? data.volume_ensilado_ton_mv / 1000 : 1;

              if (insumoInoc.estoque_atual < quantidade) {
                throw new Error(
                  `Estoque insuficiente de ${insumoInoc.nome}. Disponível: ${insumoInoc.estoque_atual} ${insumoInoc.unidade}, Necessário: ${quantidade}`
                );
              }

              await q.movimentacoesInsumo.create({
                insumo_id: data.insumo_inoculante_id,
                tipo: 'Saída',
                quantidade,
                valor_unitario: insumoInoc.custo_medio,
                tipo_saida: 'USO_INTERNO',
                destino_tipo: 'silo',
                destino_id: siloId,
                origem: 'silo',
                data: new Date().toISOString().split('T')[0],
                observacoes: `Inoculante para silo: ${data.nome} (${data.volume_ensilado_ton_mv} ton MV)`,
              } as any);
            }

            toast.success('Silo criado com sucesso! Saídas de insumo registradas.');
          } catch (insumoError) {
            console.error('Erro ao integrar insumos em silo:', insumoError);
            // Reverter silo se falhar integração
            await q.silos.remove(siloId);
            throw insumoError;
          }
        } else {
          toast.success('Silo criado com sucesso!');
        }
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

          {/* Tipo de Estrutura */}
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
                    <SelectItem value="Superfície">Superfície</SelectItem>
                    <SelectItem value="Trincheira">Trincheira</SelectItem>
                    <SelectItem value="Bag">Bag (Bolsa)</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
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
              {...form.register('cultura_ensilada')}
            />
          </div>

          {/* Volume Ensilado */}
          <div className="space-y-2">
            <Label htmlFor="silo-volume">Volume Ensilado (ton MV)</Label>
            <Input
              id="silo-volume"
              type="number"
              step="0.1"
              placeholder="Ex: 150.5"
              {...form.register('volume_ensilado_ton_mv', {
                setValueAs: (v) => (v === '' ? null : parseFloat(v)),
              })}
            />
            {form.formState.errors.volume_ensilado_ton_mv && (
              <p className="text-xs text-destructive">{form.formState.errors.volume_ensilado_ton_mv.message}</p>
            )}
          </div>

          {/* Dimensões */}
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
                    setValueAs: (v) => (v === '' ? null : parseFloat(v)),
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
                    setValueAs: (v) => (v === '' ? null : parseFloat(v)),
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
                    setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                  })}
                />
              </div>
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

          {/* Matéria Seca */}
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
