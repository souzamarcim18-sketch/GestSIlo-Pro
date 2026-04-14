'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { q } from '@/lib/supabase/queries-audit';
import { siloSchema, TIPOS_SILO } from '@/lib/validations/silos';
import type { SiloInput } from '@/lib/validations/silos';
import type { Talhao, Insumo, Silo } from '@/lib/supabase';

interface SiloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  siloData?: Silo;
  onSuccess: () => void;
}

export function SiloForm({
  open,
  onOpenChange,
  mode,
  siloData,
  onSuccess,
}: SiloFormProps) {
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loadingTalhoes, setLoadingTalhoes] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SiloInput>({
    resolver: zodResolver(siloSchema),
    defaultValues: siloData || {
      nome: '',
      tipo: 'Superfície',
      talhao_id: null,
      cultura_ensilada: '',
      data_fechamento: null,
      data_abertura_prevista: null,
      observacoes_gerais: '',
      volume_ensilado_ton_mv: null,
      materia_seca_percent: null,
      comprimento_m: null,
      largura_m: null,
      altura_m: null,
      insumo_lona_id: null,
      insumo_inoculante_id: null,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const talhaoId = watch('talhao_id');
  const dataFechamento = watch('data_fechamento');
  const altura = watch('altura_m');
  const comprimento = watch('comprimento_m');
  const largura = watch('largura_m');

  // Fetch talhões ao abrir o diálogo
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoadingTalhoes(true);
        const [talhoesData, insumosData] = await Promise.all([
          q.talhoes.list(),
          q.insumos.list(),
        ]);
        setTalhoes(talhoesData);
        setInsumos(insumosData);
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoadingTalhoes(false);
        setLoadingInsumos(false);
      }
    };

    loadData();
  }, [open]);

  // Auto-preencher cultura quando talhão é selecionado
  useEffect(() => {
    if (!talhaoId) {
      setValue('cultura_ensilada', '');
      return;
    }

    const loadCultura = async () => {
      try {
        // Buscar ciclos agrícolas do talhão e extrair a cultura
        const ciclos = await q.ciclosAgricolas.listByTalhoes([talhaoId]);
        const cicloAtivo = ciclos.find(
          (c) => !c.data_colheita_real || new Date(c.data_colheita_real) > new Date()
        );
        setValue('cultura_ensilada', cicloAtivo?.cultura || '');
      } catch {
        // Se não conseguir carregar, deixa em branco
        setValue('cultura_ensilada', '');
      }
    };

    loadCultura();
  }, [talhaoId, setValue]);

  // Auto-calcular data de abertura prevista (+60 dias)
  useEffect(() => {
    if (!dataFechamento) {
      setValue('data_abertura_prevista', null);
      return;
    }

    const fechamento = new Date(dataFechamento);
    const aberturaPrevista = addDays(fechamento, 60);
    // Converter de volta para string ISO (YYYY-MM-DD)
    const dataStr = aberturaPrevista.toISOString().split('T')[0];
    setValue('data_abertura_prevista', dataStr);
  }, [dataFechamento, setValue]);

  // Calcular densidade
  const calcularDensidade = () => {
    if (!altura || !comprimento || !largura) return null;

    const volume = (comprimento * largura * altura) / 1000; // em m³
    const volumeTon = volume; // simplificado: 1 ton ~= 1 m³

    if (!volumeTon) return null;
    return (watch('volume_ensilado_ton_mv') || 0) / volumeTon;
  };

  const densidade = calcularDensidade();

  const getDensidadeIndicador = () => {
    if (!densidade) return null;
    if (densidade >= 0.6 && densidade <= 0.8) return { cor: '🟢', status: 'Ótimo' };
    if (densidade >= 0.5 && densidade < 0.6) return { cor: '🟡', status: 'Aceitável' };
    if (densidade >= 0.8 && densidade <= 0.9) return { cor: '🟡', status: 'Aceitável' };
    return { cor: '🔴', status: 'Fora da faixa' };
  };

  const densidadeIndicador = getDensidadeIndicador();

  const onSubmit = async (data: SiloInput) => {
    try {
      setSubmitting(true);

      if (mode === 'create') {
        await q.silos.create({
          nome: data.nome,
          tipo: data.tipo,
          talhao_id: data.talhao_id,
          cultura_ensilada: data.cultura_ensilada || null,
          data_fechamento: data.data_fechamento || null,
          data_abertura_prevista: data.data_abertura_prevista || null,
          observacoes_gerais: data.observacoes_gerais || null,
          volume_ensilado_ton_mv: data.volume_ensilado_ton_mv || null,
          materia_seca_percent: data.materia_seca_percent || null,
          comprimento_m: data.comprimento_m || null,
          largura_m: data.largura_m || null,
          altura_m: data.altura_m || null,
          insumo_lona_id: data.insumo_lona_id || null,
          insumo_inoculante_id: data.insumo_inoculante_id || null,
        } as any);
        toast.success('Silo criado com sucesso!');
      } else if (mode === 'edit' && siloData) {
        await q.silos.update(siloData.id, {
          nome: data.nome,
          tipo: data.tipo,
          talhao_id: data.talhao_id,
          cultura_ensilada: data.cultura_ensilada || null,
          data_fechamento: data.data_fechamento || null,
          data_abertura_prevista: data.data_abertura_prevista || null,
          observacoes_gerais: data.observacoes_gerais || null,
          volume_ensilado_ton_mv: data.volume_ensilado_ton_mv || null,
          materia_seca_percent: data.materia_seca_percent || null,
          comprimento_m: data.comprimento_m || null,
          largura_m: data.largura_m || null,
          altura_m: data.altura_m || null,
          insumo_lona_id: data.insumo_lona_id || null,
          insumo_inoculante_id: data.insumo_inoculante_id || null,
        } as any);
        toast.success('Silo atualizado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar silo';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'create'
      ? 'Cadastrar Novo Silo'
      : `Editar ${siloData?.nome || 'Silo'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Preencha os dados do silo conforme as abas abaixo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="dados-gerais" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              <TabsTrigger value="quantitativo">Dados Quantitativos</TabsTrigger>
              <TabsTrigger value="insumos">Insumos</TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS GERAIS */}
            <TabsContent value="dados-gerais" className="space-y-4 mt-4">
              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Silo 01"
                  {...register('nome')}
                  disabled={submitting}
                />
                {errors.nome && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.nome.message}
                  </p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}
                    >
                      <SelectTrigger id="tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_SILO.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipo && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.tipo.message}
                  </p>
                )}
              </div>

              {/* Talhão */}
              <div>
                <Label htmlFor="talhao_id">Talhão</Label>
                <Controller
                  name="talhao_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) =>
                        field.onChange(val || null)
                      }
                      disabled={submitting || loadingTalhoes}
                    >
                      <SelectTrigger id="talhao_id">
                        <SelectValue placeholder="Selecione um talhão" />
                      </SelectTrigger>
                      <SelectContent>
                        {talhoes.map((talhao) => (
                          <SelectItem key={talhao.id} value={talhao.id}>
                            {talhao.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.talhao_id && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.talhao_id.message}
                  </p>
                )}
              </div>

              {/* Cultura (read-only) */}
              <div>
                <Label htmlFor="cultura_ensilada">Cultura Ensilada</Label>
                <Input
                  id="cultura_ensilada"
                  {...register('cultura_ensilada')}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              {/* Data Fechamento */}
              <div>
                <Label htmlFor="data_fechamento">Data de Fechamento</Label>
                <Input
                  id="data_fechamento"
                  type="date"
                  {...register('data_fechamento')}
                  disabled={submitting}
                />
              </div>

              {/* Data Abertura Prevista (read-only, auto-calculada) */}
              <div>
                <Label htmlFor="data_abertura_prevista">
                  Data Abertura Prevista (+60 dias)
                </Label>
                <Input
                  id="data_abertura_prevista"
                  type="date"
                  {...register('data_abertura_prevista')}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes_gerais">Observações</Label>
                <Input
                  id="observacoes_gerais"
                  placeholder="Notas gerais sobre o silo"
                  {...register('observacoes_gerais')}
                  disabled={submitting}
                />
              </div>
            </TabsContent>

            {/* ABA 2: DADOS QUANTITATIVOS */}
            <TabsContent value="quantitativo" className="space-y-4 mt-4">
              {/* Volume */}
              <div>
                <Label htmlFor="volume_ensilado_ton_mv">Volume (ton MV)</Label>
                <Input
                  id="volume_ensilado_ton_mv"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('volume_ensilado_ton_mv')}
                  disabled={submitting}
                />
              </div>

              {/* MS */}
              <div>
                <Label htmlFor="materia_seca_percent">MS (%)</Label>
                <Input
                  id="materia_seca_percent"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('materia_seca_percent')}
                  disabled={submitting}
                />
              </div>

              {/* Comprimento */}
              <div>
                <Label htmlFor="comprimento_m">Comprimento (m)</Label>
                <Input
                  id="comprimento_m"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('comprimento_m')}
                  disabled={submitting}
                />
              </div>

              {/* Largura */}
              <div>
                <Label htmlFor="largura_m">Largura (m)</Label>
                <Input
                  id="largura_m"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('largura_m')}
                  disabled={submitting}
                />
              </div>

              {/* Altura */}
              <div>
                <Label htmlFor="altura_m">Altura (m)</Label>
                <Input
                  id="altura_m"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('altura_m')}
                  disabled={submitting}
                />
              </div>

              {/* Densidade (read-only, calculada) */}
              <div>
                <Label htmlFor="densidade">
                  Densidade (calculada)
                  {densidadeIndicador && ` ${densidadeIndicador.cor}`}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="densidade"
                    type="number"
                    value={densidade ? densidade.toFixed(2) : ''}
                    disabled
                    className="bg-gray-100"
                  />
                  {densidadeIndicador && (
                    <div className="flex items-center px-3 bg-gray-100 rounded border">
                      <span className="text-sm font-medium">
                        {densidadeIndicador.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: INSUMOS */}
            <TabsContent value="insumos" className="space-y-4 mt-4">
              {/* Lona */}
              <div>
                <Label htmlFor="insumo_lona_id">Lona</Label>
                <Controller
                  name="insumo_lona_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) =>
                        field.onChange(val || null)
                      }
                      disabled={submitting || loadingInsumos}
                    >
                      <SelectTrigger id="insumo_lona_id">
                        <SelectValue placeholder="Selecione uma lona" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.map((insumo) => (
                          <SelectItem key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Inoculante */}
              <div>
                <Label htmlFor="insumo_inoculante_id">Inoculante</Label>
                <Controller
                  name="insumo_inoculante_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) =>
                        field.onChange(val || null)
                      }
                      disabled={submitting || loadingInsumos}
                    >
                      <SelectTrigger id="insumo_inoculante_id">
                        <SelectValue placeholder="Selecione um inoculante" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.map((insumo) => (
                          <SelectItem key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Botões */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
