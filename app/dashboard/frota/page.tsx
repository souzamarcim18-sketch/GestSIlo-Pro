'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Truck,
  Settings,
  Fuel,
  Clock,
  Gauge,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { type Maquina, type UsoMaquina, type Manutencao, type Abastecimento } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { format, isBefore, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Schema Zod — Nova Máquina
// ---------------------------------------------------------------------------
const TIPOS_MAQUINA = ['Trator', 'Colheitadeira', 'Pulverizador', 'Caminhão', 'Outros'] as const;

const maquinaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tipo: z.enum(TIPOS_MAQUINA),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  ano: z.number().int().min(1900).max(2100).nullable().optional(),
  identificacao: z.string().optional(),
  consumo_medio_lh: z.number().min(0).nullable().optional(),
  valor_aquisicao: z.number().min(0).nullable().optional(),
  data_aquisicao: z.string().nullable().optional(),
  vida_util_anos: z.number().int().min(1).optional(),
});
type MaquinaFormData = z.infer<typeof maquinaSchema>;

const abastecimentoSchema = z.object({
  maquina_id: z.string().min(1, 'Máquina obrigatória'),
  data: z.string().min(1, 'Data obrigatória'),
  combustivel: z.enum(['Diesel', 'Gasolina', 'Etanol', 'GNV']),
  litros: z.number().positive('Litros deve ser > 0'),
  valor: z.number().nonnegative('Valor não pode ser negativo'),
  hodometro: z.number().nonnegative('Hodômetro não pode ser negativo').optional(),
  insumo_id: z.string().uuid().optional(),
  registrar_como_saida: z.boolean(),
});
type AbastecimentoFormData = z.infer<typeof abastecimentoSchema>;

// Componente do Formulário de Abastecimento
interface AbastecimentoFormProps {
  maquinas: Maquina[];
  onSuccess: () => void;
  onError: (error: Error) => void;
}

function AbastecimentoForm({ maquinas, onSuccess, onError }: AbastecimentoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AbastecimentoFormData>({
    resolver: zodResolver(abastecimentoSchema),
    defaultValues: {
      maquina_id: '',
      data: new Date().toISOString().split('T')[0],
      registrar_como_saida: true,
      combustivel: 'Diesel',
    },
  });

  const maquinaIdValue = watch('maquina_id');
  const registrarComoSaida = watch('registrar_como_saida');

  // Helper para garantir que o valor é string para o Select component
  const selectValue = (val: string | null | undefined): string => (val as string) || '';

  const onSubmit = async (data: AbastecimentoFormData) => {
    setIsLoading(true);
    try {
      // Criar abastecimento
      const abastecimento = await q.abastecimentos.create({
        maquina_id: data.maquina_id,
        data: data.data,
        combustivel: data.combustivel,
        litros: data.litros,
        valor: data.valor,
        hodometro: data.hodometro || null,
      } as any);

      // Integração Frota → Insumos: Se marcado, criar saída de combustível
      if (data.registrar_como_saida && data.insumo_id) {
        try {
          const insumo = await q.insumos.getById(data.insumo_id);

          // Validar estoque
          if (insumo.estoque_atual < data.litros) {
            throw new Error(
              `Estoque insuficiente. Disponível: ${insumo.estoque_atual} L, Solicitado: ${data.litros} L`
            );
          }

          // Criar saída de combustível
          await q.movimentacoesInsumo.create({
            insumo_id: data.insumo_id,
            tipo: 'Saída',
            quantidade: data.litros,
            valor_unitario: data.valor / data.litros,
            tipo_saida: 'USO_INTERNO',
            destino_tipo: 'maquina',
            destino_id: data.maquina_id,
            origem: 'frota',
            data: data.data,
            observacoes: `Abastecimento de ${data.combustivel} - ${data.litros} L`,
          } as any);

          toast.success('Abastecimento registrado com saída de insumo');
        } catch (insumoError) {
          console.error('Erro ao integrar combustível:', insumoError);
          // Reverter abastecimento se falhar integração
          await q.abastecimentos.remove(abastecimento.id);
          throw insumoError;
        }
      } else {
        toast.success('Abastecimento registrado');
      }

      reset();
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Erro ao registrar'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="maquina_id">Máquina</Label>
        <Select value={selectValue(maquinaIdValue)} onValueChange={(v) => setValue('maquina_id', v)}>
          <SelectTrigger id="maquina_id">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {maquinas.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.maquina_id && <p className="text-sm text-red-500">{errors.maquina_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" {...register('data')} />
          {errors.data && <p className="text-sm text-red-500">{errors.data.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="combustivel">Combustível</Label>
          <Select value={watch('combustivel') || ''} onValueChange={(v) => setValue('combustivel', v as any)}>
            <SelectTrigger id="combustivel">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {['Diesel', 'Gasolina', 'Etanol', 'GNV'].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.combustivel && <p className="text-sm text-red-500">{errors.combustivel.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="litros">Litros</Label>
          <Input
            id="litros"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('litros', { valueAsNumber: true })}
          />
          {errors.litros && <p className="text-sm text-red-500">{errors.litros.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('valor', { valueAsNumber: true })}
          />
          {errors.valor && <p className="text-sm text-red-500">{errors.valor.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hodometro">Hodômetro (opcional)</Label>
        <Input
          id="hodometro"
          type="number"
          placeholder="0"
          {...register('hodometro', { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('registrar_como_saida')}
            className="w-4 h-4"
          />
          <span className="text-sm">Registrar como saída de insumo</span>
        </label>
      </div>

      {registrarComoSaida && (
        <div className="space-y-2 bg-blue-50 p-3 rounded">
          <Label htmlFor="insumo_id">Insumo (Combustível)</Label>
          <Select value={watch('insumo_id') || ''} onValueChange={(v) => setValue('insumo_id', v)}>
            <SelectTrigger id="insumo_id">
              <SelectValue placeholder="Selecione combustível" />
            </SelectTrigger>
            <SelectContent>
              {maquinas.length > 0 && (
                <SelectItem value="">Carregando...</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Registrar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function FrotaPage() {
  const { loading: authLoading } = useAuth();
  const [maquinas, setMaquinas]           = useState<Maquina[]>([]);
  const [usos, setUsos]                   = useState<UsoMaquina[]>([]);
  const [manutencoes, setManutencoes]     = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isAddMaquinaOpen, setIsAddMaquinaOpen] = useState(false);
  const [isManutencaoOpen, setIsManutencaoOpen] = useState(false);
  const [isAbastecimentoOpen, setIsAbastecimentoOpen] = useState(false);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<string>('');

  // IDs estáveis para associação label ↔ controle
  const uid = useId();
  const ids = {
    manTitle:   `${uid}-man-title`,
    manDesc:    `${uid}-man-desc`,
    manMaq:     `${uid}-man-maq`,
    manTipo:    `${uid}-man-tipo`,
    maqTitle:   `${uid}-maq-title`,
    maqDesc:    `${uid}-maq-desc`,
    maqTipo:    `${uid}-maq-tipo`,
    depValor:   `${uid}-dep-valor`,
    depData:    `${uid}-dep-data`,
    depVida:    `${uid}-dep-vida`,
  };

  const maquinaForm = useForm<MaquinaFormData>({
    resolver: zodResolver(maquinaSchema),
    defaultValues: {
      nome: '',
      tipo: 'Trator',
      marca: '',
      modelo: '',
      ano: null,
      identificacao: '',
      consumo_medio_lh: null,
      valor_aquisicao: null,
      data_aquisicao: null,
      vida_util_anos: 10,
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const maquinasData = await q.maquinas.list();
      const maquinaIds = maquinasData.map((m) => m.id);

      const [usosData, manutencoesData, abastecimentosData] = await Promise.all([
        q.usoMaquinas.listByMaquinas(maquinaIds),
        q.manutencoes.listByMaquinas(maquinaIds),
        q.abastecimentos.listByMaquinas(maquinaIds),
      ]);

      setMaquinas(maquinasData);
      setUsos(usosData);
      setManutencoes(manutencoesData);
      setAbastecimentos(abastecimentosData);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const handleAddMaquina = async (data: MaquinaFormData) => {
    try {
      await q.maquinas.create({
        nome: data.nome,
        tipo: data.tipo,
        marca: data.marca || null,
        modelo: data.modelo || null,
        ano: data.ano ?? null,
        identificacao: data.identificacao || null,
        fazenda_id: '',
        consumo_medio_lh: data.consumo_medio_lh ?? null,
        valor_aquisicao: data.valor_aquisicao ?? null,
        data_aquisicao: data.data_aquisicao || null,
        vida_util_anos: data.vida_util_anos ?? 10,
      });
      toast.success('Máquina cadastrada com sucesso!');
      setIsAddMaquinaOpen(false);
      maquinaForm.reset();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar máquina');
    }
  };

  const calcularDepreciacao = (maquina: Maquina) => {
    if (!maquina.valor_aquisicao || !maquina.data_aquisicao) return null;
    const anosUso =
      differenceInDays(new Date(), new Date(maquina.data_aquisicao)) / 365;
    const depAnual = maquina.valor_aquisicao / (maquina.vida_util_anos ?? 10);
    const valorAtual = Math.max(0, maquina.valor_aquisicao - depAnual * anosUso);
    return {
      valorAtual,
      depAcumulada: maquina.valor_aquisicao - valorAtual,
      percentualRestante: (valorAtual / maquina.valor_aquisicao) * 100,
    };
  };

  const getMaintenanceStatus = (maquinaId: string) => {
    const maquinaManutencoes = manutencoes.filter((m) => m.maquina_id === maquinaId);
    if (maquinaManutencoes.length === 0) return null;

    const last = maquinaManutencoes[maquinaManutencoes.length - 1];
    if (!last.proxima_manutencao) return null;

    const nextDate = new Date(last.proxima_manutencao);
    const today    = new Date();

    if (isBefore(nextDate, today))            return 'vencida';
    if (isBefore(nextDate, addDays(today, 7))) return 'proxima';
    return null;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Frota e Máquinas</h1>
        <div className="flex gap-2">

          {/* Dialog: Registrar Manutenção */}
          <Dialog open={isManutencaoOpen} onOpenChange={setIsManutencaoOpen}>
            <DialogTrigger>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Registrar Manutenção
              </Button>
            </DialogTrigger>
            <DialogContent
              aria-labelledby={ids.manTitle}
              aria-describedby={ids.manDesc}
            >
              <DialogHeader>
                <DialogTitle id={ids.manTitle}>Nova Manutenção</DialogTitle>
                <DialogDescription id={ids.manDesc}>
                  Registre serviços preventivos ou corretivos.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success('Manutenção registrada!');
                  setIsManutencaoOpen(false);
                }}
                className="space-y-4 py-4"
                aria-labelledby={ids.manTitle}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={ids.manMaq}>Máquina</Label>
                    <Select required>
                      <SelectTrigger id={ids.manMaq}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {maquinas.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={ids.manTipo}>Tipo</Label>
                    <Select defaultValue="Preventiva">
                      <SelectTrigger id={ids.manTipo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="man-desc">Descrição do Serviço</Label>
                  <Input
                    id="man-desc"
                    placeholder="Ex: Troca de óleo, reparo hidráulico"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="man-custo">Custo (R$)</Label>
                    <Input
                      id="man-custo"
                      type="number"
                      step="0.01"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="man-prox">Próxima Manutenção</Label>
                    <Input id="man-prox" type="date" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Nova Máquina */}
          <Dialog
            open={isAddMaquinaOpen}
            onOpenChange={(open) => { setIsAddMaquinaOpen(open); if (!open) maquinaForm.reset(); }}
          >
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nova Máquina
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-2xl"
              aria-labelledby={ids.maqTitle}
              aria-describedby={ids.maqDesc}
            >
              <DialogHeader>
                <DialogTitle id={ids.maqTitle}>Cadastrar Nova Máquina</DialogTitle>
                <DialogDescription id={ids.maqDesc}>
                  Adicione um novo equipamento à frota.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={maquinaForm.handleSubmit(handleAddMaquina)}
                className="space-y-4 py-4"
                aria-labelledby={ids.maqTitle}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-nome">Nome / Identificação</Label>
                    <Input
                      id="maq-nome"
                      placeholder="Ex: Trator JD 01"
                      aria-required="true"
                      {...maquinaForm.register('nome')}
                    />
                    {maquinaForm.formState.errors.nome && (
                      <p className="text-xs text-destructive">{maquinaForm.formState.errors.nome.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-ident">Placa / Patrimônio</Label>
                    <Input
                      id="maq-ident"
                      placeholder="Ex: ABC-1234"
                      {...maquinaForm.register('identificacao')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={ids.maqTipo}>Tipo</Label>
                    <Controller
                      control={maquinaForm.control}
                      name="tipo"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id={ids.maqTipo}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Trator">Trator</SelectItem>
                            <SelectItem value="Colheitadeira">Colheitadeira</SelectItem>
                            <SelectItem value="Pulverizador">Pulverizador</SelectItem>
                            <SelectItem value="Caminhão">Caminhão</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-marca">Marca</Label>
                    <Input
                      id="maq-marca"
                      placeholder="Ex: John Deere"
                      {...maquinaForm.register('marca')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-modelo">Modelo</Label>
                    <Input
                      id="maq-modelo"
                      placeholder="Ex: 6125J"
                      {...maquinaForm.register('modelo')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-ano">Ano</Label>
                    <Input
                      id="maq-ano"
                      type="number"
                      {...maquinaForm.register('ano', {
                        setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-cons">Consumo (L/h)</Label>
                    <Input
                      id="maq-cons"
                      type="number"
                      step="0.1"
                      {...maquinaForm.register('consumo_medio_lh', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                </div>

                {/* Seção de depreciação */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <p className="text-sm font-semibold flex items-center gap-2" id={`${uid}-dep-heading`}>
                    <TrendingDown className="w-4 h-4" aria-hidden="true" />
                    Dados para Depreciação
                  </p>
                  <div
                    className="grid grid-cols-3 gap-4"
                    role="group"
                    aria-labelledby={`${uid}-dep-heading`}
                  >
                    <div className="space-y-2">
                      <Label htmlFor={ids.depValor} className="text-xs">
                        Valor Aquisição (R$)
                      </Label>
                      <Input
                        id={ids.depValor}
                        type="number"
                        step="0.01"
                        {...maquinaForm.register('valor_aquisicao', {
                          setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={ids.depData} className="text-xs">
                        Data Aquisição
                      </Label>
                      <Input
                        id={ids.depData}
                        type="date"
                        {...maquinaForm.register('data_aquisicao', {
                          setValueAs: (v) => (v === '' ? null : v),
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={ids.depVida} className="text-xs">
                        Vida Útil (Anos)
                      </Label>
                      <Input
                        id={ids.depVida}
                        type="number"
                        {...maquinaForm.register('vida_util_anos', {
                          setValueAs: (v) => (v === '' ? 10 : parseInt(v, 10)),
                        })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={maquinaForm.formState.isSubmitting}>
                    {maquinaForm.formState.isSubmitting ? 'Cadastrando...' : 'Cadastrar Máquina'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* ── Cards de Máquinas ──────────────────────────────────────────── */}
      <section aria-labelledby="frota-heading">
        <h2 id="frota-heading" className="sr-only">Máquinas cadastradas</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {maquinas.map((maquina) => {
            const dep = calcularDepreciacao(maquina);
            const maintenanceStatus = getMaintenanceStatus(maquina.id);

            const horasTotais = usos
              .filter((u) => u.maquina_id === maquina.id)
              .reduce((acc: number, u: UsoMaquina) => acc + (u.horas || 0), 0);

            const kmTotais = usos
              .filter((u) => u.maquina_id === maquina.id)
              .reduce((acc: number, u: UsoMaquina) => acc + (u.km || 0), 0);

            return (
              <Card key={maquina.id} aria-label={`Máquina: ${maquina.nome}`} className="rounded-2xl bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold">
                    {maquina.nome}
                  </CardTitle>
                  <Truck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {maquina.tipo}
                        {maquina.identificacao ? ` • ${maquina.identificacao}` : ''}
                      </span>

                      {maintenanceStatus === 'vencida' && (
                        <Badge
                          variant="destructive"
                          className="motion-safe:animate-pulse"
                          aria-label="Atenção: manutenção vencida"
                          role="status"
                        >
                          Manutenção Vencida
                        </Badge>
                      )}
                      {maintenanceStatus === 'proxima' && (
                        <Badge
                          variant="secondary"
                          className="bg-secondary/100 text-white dark:bg-secondary/30 dark:text-secondary"
                          aria-label="Próxima manutenção em menos de 7 dias"
                          role="status"
                        >
                          Próxima Manutenção
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {[maquina.marca, maquina.modelo, maquina.ano].filter(Boolean).join(' ')}
                    </div>

                    {dep && (
                      <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex justify-between text-xs font-semibold uppercase text-muted-foreground">
                          <span>Valor Atual Estimado</span>
                          <span className="text-[#10B981] dark:text-[#10B981]">
                            -{(100 - dep.percentualRestante).toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className="text-lg font-bold text-foreground"
                          aria-label={`Valor atual estimado: R$ ${dep.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        >
                          R${' '}
                          {dep.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Aquisição: R${' '}
                            {maquina.valor_aquisicao?.toLocaleString('pt-BR')}
                          </span>
                          <span>Vida Útil: {maquina.vida_util_anos} anos</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2 border-t">
                      <div
                        className="flex items-center gap-1 text-xs font-medium text-[--status-info] dark:text-[--status-info]"
                        aria-label={`Horas trabalhadas: ${horasTotais} horas`}
                      >
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {horasTotais}h
                      </div>
                      <div
                        className="flex items-center gap-1 text-xs font-medium text-[#10B981] dark:text-[#10B981]"
                        aria-label={`Quilometragem: ${kmTotais} km`}
                      >
                        <Gauge className="w-3 h-3" aria-hidden="true" />
                        {kmTotais}km
                      </div>
                      {maquina.consumo_medio_lh && (
                        <div
                          className="flex items-center gap-1 text-xs font-medium text-secondary dark:text-secondary"
                          aria-label={`Consumo médio: ${maquina.consumo_medio_lh} litros por hora`}
                        >
                          <Fuel className="w-3 h-3" aria-hidden="true" />
                          {maquina.consumo_medio_lh}L/h
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Estado vazio */}
          {maquinas.length === 0 && !loading && (
            <Card
              className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed rounded-2xl bg-card shadow-sm"
              role="status"
              aria-label="Nenhuma máquina cadastrada"
            >
              <Truck
                className="h-12 w-12 text-muted-foreground mb-4 opacity-20"
                aria-hidden="true"
              />
              <CardTitle className="text-muted-foreground">
                Nenhuma máquina cadastrada
              </CardTitle>
              <CardDescription>
                Clique em &quot;Nova Máquina&quot; para começar a gerenciar sua frota.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      {/* ── Tabs de histórico ──────────────────────────────────────────── */}
      <Tabs defaultValue="uso" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="uso"          aria-label="Aba: Uso Diário">Uso Diário</TabsTrigger>
          <TabsTrigger value="manutencao"   aria-label="Aba: Manutenções">Manutenções</TabsTrigger>
          <TabsTrigger value="abastecimento" aria-label="Aba: Abastecimentos">Abastecimentos</TabsTrigger>
        </TabsList>

        {/* Aba: Uso Diário */}
        <TabsContent value="uso" className="mt-4">
          <Card className="rounded-2xl bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="uso-titulo">Histórico de Uso</CardTitle>
                <CardDescription>Registros de atividades e horas trabalhadas.</CardDescription>
              </div>
              <Button size="sm" disabled aria-disabled="true" aria-label="Registrar uso — funcionalidade em breve">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Registrar Uso
              </Button>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table aria-labelledby="uso-titulo">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Máquina</TableHead>
                    <TableHead scope="col">Operador</TableHead>
                    <TableHead scope="col">Atividade</TableHead>
                    <TableHead scope="col">Horas</TableHead>
                    <TableHead scope="col">KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usos.map((uso) => (
                    <TableRow key={uso.id}>
                      <TableCell>
                        {format(new Date(uso.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find((m) => m.id === uso.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>{uso.operador}</TableCell>
                      <TableCell>{uso.atividade}</TableCell>
                      <TableCell>{uso.horas ? `${uso.horas}h` : '—'}</TableCell>
                      <TableCell>{uso.km   ? `${uso.km}km`   : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {usos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhum registro de uso encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Manutenções */}
        <TabsContent value="manutencao" className="mt-4">
          <Card className="rounded-2xl bg-card shadow-sm">
            <CardHeader>
              <CardTitle id="man-hist-titulo">Histórico de Manutenções</CardTitle>
              <CardDescription>Serviços realizados e próximos agendamentos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table aria-labelledby="man-hist-titulo">
                  <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Máquina</TableHead>
                    <TableHead scope="col">Tipo</TableHead>
                    <TableHead scope="col">Descrição</TableHead>
                    <TableHead scope="col">Custo</TableHead>
                    <TableHead scope="col">Próxima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manutencoes.map((man) => (
                    <TableRow key={man.id}>
                      <TableCell>
                        {format(new Date(man.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find((m) => m.id === man.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={man.tipo === 'Preventiva' ? 'outline' : 'secondary'}>
                          {man.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{man.descricao}</TableCell>
                      <TableCell className="font-bold">
                        R$ {man.custo?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {man.proxima_manutencao
                          ? format(new Date(man.proxima_manutencao), 'dd/MM/yyyy', { locale: ptBR })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {manutencoes.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhuma manutenção registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Abastecimentos */}
        <TabsContent value="abastecimento" className="mt-4">
          <Card className="rounded-2xl bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="abast-titulo">Histórico de Abastecimentos</CardTitle>
                <CardDescription>Consumo de combustível por máquina.</CardDescription>
              </div>
              <Dialog open={isAbastecimentoOpen} onOpenChange={setIsAbastecimentoOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => setMaquinaSelecionada('')}>
                    <Fuel className="mr-2 h-4 w-4" aria-hidden="true" />
                    Novo Abastecimento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Registrar Abastecimento</DialogTitle>
                    <DialogDescription>Registre combustível consumido</DialogDescription>
                  </DialogHeader>
                  <AbastecimentoForm
                    maquinas={maquinas}
                    onSuccess={() => {
                      setIsAbastecimentoOpen(false);
                      setMaquinaSelecionada('');
                      // Recarregar abastecimentos
                      const maquinaIds = maquinas.map((m) => m.id);
                      q.abastecimentos.listByMaquinas(maquinaIds).then(setAbastecimentos);
                    }}
                    onError={(error) => {
                      toast.error(error instanceof Error ? error.message : 'Erro ao registrar abastecimento');
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table aria-labelledby="abast-titulo">
                  <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Máquina</TableHead>
                    <TableHead scope="col">Combustível</TableHead>
                    <TableHead scope="col">Litros</TableHead>
                    <TableHead scope="col">Valor Total</TableHead>
                    <TableHead scope="col">Hodômetro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abastecimentos.map((abs) => (
                    <TableRow key={abs.id}>
                      <TableCell>
                        {format(new Date(abs.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find((m) => m.id === abs.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>{abs.combustivel}</TableCell>
                      <TableCell className="font-bold">{abs.litros} L</TableCell>
                      <TableCell>R$ {abs.valor?.toFixed(2)}</TableCell>
                      <TableCell>{abs.hodometro}</TableCell>
                    </TableRow>
                  ))}
                  {abastecimentos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhum abastecimento registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      </div>
    </div>
  );
}
