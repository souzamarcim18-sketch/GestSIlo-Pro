'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Database,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { type Silo, type MovimentacaoSilo, type Insumo } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { getCustoProducaoSilagem } from '@/lib/supabase/silos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------
const TIPOS_SILO = ['Superfície', 'Trincheira', 'Bag', 'Outros'] as const;

const siloSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tipo: z.enum(['Superfície', 'Trincheira', 'Bag', 'Outros'] as const),
  talhao_id: z.string().nullable().optional(),
  materia_seca_percent: z.number().min(0).max(100).nullable().optional(),
  volume_ensilado_ton_mv: z.number().min(0).nullable().optional(),
  insumo_lona_id: z.string().nullable().optional(),
  insumo_inoculante_id: z.string().nullable().optional(),
});
type SiloFormData = z.infer<typeof siloSchema>;

const movSchema = z.object({
  silo_id: z.string().min(1, 'Selecione um silo'),
  tipo: z.enum(['Entrada', 'Saída'] as const),
  subtipo: z.string().nullable().optional(),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  responsavel: z.string().min(1, 'Informe o responsável'),
  observacao: z.string().optional(),
});
type MovFormData = z.infer<typeof movSchema>;

export default function SilosPage() {
  const { loading: authLoading } = useAuth();
  const [silos, setSilos] = useState<Silo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [custos, setCustos] = useState<Record<string, { custoPorTonelada: number } | null>>({});
  const [loading, setLoading] = useState(true);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);

  const siloForm = useForm<SiloFormData>({
    resolver: zodResolver(siloSchema),
    defaultValues: {
      nome: '',
      tipo: 'Trincheira',
      talhao_id: null,
      materia_seca_percent: null,
      volume_ensilado_ton_mv: null,
      insumo_lona_id: null,
      insumo_inoculante_id: null,
    },
  });

  const movForm = useForm<MovFormData>({
    resolver: zodResolver(movSchema),
    defaultValues: {
      silo_id: '',
      tipo: 'Entrada',
      responsavel: '',
      observacao: '',
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [silosData, insumosData] = await Promise.all([
        q.silos.list(),
        q.insumos.list(),
      ]);
      setSilos(silosData);
      setInsumos(insumosData);

      const movsData = await q.movimentacoesSilo.listBySilos(silosData.map((s) => s.id));
      setMovimentacoes(movsData);

      const custosResults = await Promise.all(
        silosData.map(async (s) => ({ id: s.id, custo: await getCustoProducaoSilagem(s.id) }))
      );
      const custosMap: Record<string, { custoPorTonelada: number } | null> = {};
      custosResults.forEach((r) => { custosMap[r.id] = r.custo; });
      setCustos(custosMap);
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

  const handleAddSilo = async (data: SiloFormData) => {
    try {
      await q.silos.create({
        nome: data.nome,
        tipo: data.tipo,
        talhao_id: data.talhao_id || null,
        cultura_ensilada: null,
        data_fechamento: null,
        data_abertura_prevista: null,
        data_abertura_real: null,
        observacoes_gerais: null,
        volume_ensilado_ton_mv: data.volume_ensilado_ton_mv ?? null,
        fazenda_id: '',
        materia_seca_percent: data.materia_seca_percent ?? null,
        comprimento_m: null,
        largura_m: null,
        altura_m: null,
        insumo_lona_id: data.insumo_lona_id || null,
        insumo_inoculante_id: data.insumo_inoculante_id || null,
      });
      toast.success('Silo cadastrado com sucesso!');
      setIsAddSiloOpen(false);
      siloForm.reset();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar silo');
    }
  };

  const handleAddMov = async (data: MovFormData) => {
    try {
      const nova = await q.movimentacoesSilo.create({
        silo_id: data.silo_id,
        tipo: data.tipo,
        subtipo: data.subtipo || null,
        quantidade: data.quantidade,
        responsavel: data.responsavel || null,
        observacao: data.observacao || null,
        talhao_id: null,
        data: new Date().toISOString(),
      });
      setMovimentacoes((prev) => [nova, ...prev]);
      toast.success('Movimentação registrada com sucesso!');
      setIsAddMovOpen(false);
      movForm.reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar movimentação');
    }
  };

  const calculateOccupancy = (siloId: string, capacity: number) => {
    const siloMovs = movimentacoes.filter((m) => m.silo_id === siloId);
    const total = siloMovs.reduce(
      (acc: number, m: MovimentacaoSilo) =>
        m.tipo === 'Entrada' ? acc + m.quantidade : acc - m.quantidade,
      0
    );
    return {
      total,
      percentage: Math.min(Math.round((total / capacity) * 100), 100),
    };
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Silos</h1>
        <div className="flex gap-2">

          {/* Dialog: Registrar Movimentação */}
          <Dialog
            open={isAddMovOpen}
            onOpenChange={(open) => { setIsAddMovOpen(open); if (!open) movForm.reset(); }}
          >
            <DialogTrigger>
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" aria-hidden="true" />
                Registrar Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent aria-labelledby="dialog-mov-title" aria-describedby="dialog-mov-desc">
              <DialogHeader>
                <DialogTitle id="dialog-mov-title">Nova Movimentação</DialogTitle>
                <DialogDescription id="dialog-mov-desc">
                  Registre a entrada ou saída de silagem.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={movForm.handleSubmit(handleAddMov)}
                className="space-y-4 py-4"
                aria-labelledby="dialog-mov-title"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-silo">Silo</Label>
                    <Controller
                      control={movForm.control}
                      name="silo_id"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="mov-silo" aria-labelledby="mov-silo">
                            <SelectValue placeholder="Selecione o silo" />
                          </SelectTrigger>
                          <SelectContent>
                            {silos.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {movForm.formState.errors.silo_id && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.silo_id.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-tipo">Tipo</Label>
                    <Controller
                      control={movForm.control}
                      name="tipo"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="mov-tipo" aria-labelledby="mov-tipo">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Entrada">Entrada</SelectItem>
                            <SelectItem value="Saída">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-qty">Quantidade (toneladas)</Label>
                    <Input
                      id="mov-qty"
                      type="number"
                      step="0.1"
                      aria-required="true"
                      {...movForm.register('quantidade', { valueAsNumber: true })}
                    />
                    {movForm.formState.errors.quantidade && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.quantidade.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-resp">Responsável</Label>
                    <Input
                      id="mov-resp"
                      aria-required="true"
                      {...movForm.register('responsavel')}
                    />
                    {movForm.formState.errors.responsavel && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.responsavel.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mov-obs">Observações</Label>
                  <Input id="mov-obs" {...movForm.register('observacao')} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={movForm.formState.isSubmitting}>
                    {movForm.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Novo Silo */}
          <Dialog
            open={isAddSiloOpen}
            onOpenChange={(open) => { setIsAddSiloOpen(open); if (!open) siloForm.reset(); }}
          >
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Novo Silo
              </Button>
            </DialogTrigger>
            <DialogContent aria-labelledby="dialog-silo-title" aria-describedby="dialog-silo-desc">
              <DialogHeader>
                <DialogTitle id="dialog-silo-title">Cadastrar Novo Silo</DialogTitle>
                <DialogDescription id="dialog-silo-desc">
                  Adicione uma nova estrutura de armazenamento.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={siloForm.handleSubmit(handleAddSilo)}
                className="space-y-4 py-4"
                aria-labelledby="dialog-silo-title"
              >
                <div className="space-y-2">
                  <Label htmlFor="silo-nome">Nome do Silo</Label>
                  <Input
                    id="silo-nome"
                    placeholder="Ex: Silo Norte 01"
                    aria-required="true"
                    {...siloForm.register('nome')}
                  />
                  {siloForm.formState.errors.nome && (
                    <p className="text-xs text-destructive">{siloForm.formState.errors.nome.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silo-tipo">Tipo de Estrutura</Label>
                    <Controller
                      control={siloForm.control}
                      name="tipo"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="silo-tipo" aria-labelledby="silo-tipo">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Superfície">Superfície</SelectItem>
                            <SelectItem value="Trincheira">Trincheira</SelectItem>
                            <SelectItem value="Bag">Bag</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silo-vol">Volume Ensilado (toneladas)</Label>
                    <Input
                      id="silo-vol"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 500.5"
                      {...siloForm.register('volume_ensilado_ton_mv', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                    {siloForm.formState.errors.volume_ensilado_ton_mv && (
                      <p className="text-xs text-destructive">{siloForm.formState.errors.volume_ensilado_ton_mv?.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silo-ms">Matéria Seca (%)</Label>
                    <Input
                      id="silo-ms"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 32.5"
                      {...siloForm.register('materia_seca_percent', {
                        setValueAs: (v) => (v === '' ? null : parseFloat(v)),
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silo-lona">Lona Utilizada</Label>
                    <Controller
                      control={siloForm.control}
                      name="insumo_lona_id"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <SelectTrigger id="silo-lona" aria-labelledby="silo-lona">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {insumos
                              .filter((i) => i.tipo === 'Outros')
                              .map((i) => (
                                <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silo-inoc">Inoculante</Label>
                    <Controller
                      control={siloForm.control}
                      name="insumo_inoculante_id"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <SelectTrigger id="silo-inoc" aria-labelledby="silo-inoc">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {insumos
                              .filter((i) => i.tipo === 'Outros')
                              .map((i) => (
                                <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={siloForm.formState.isSubmitting}>
                    {siloForm.formState.isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* ── Cards de Silos ─────────────────────────────────────────────── */}
      <section aria-labelledby="silos-heading">
        <h2 id="silos-heading" className="sr-only">
          Lista de silos cadastrados
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {silos.map((silo) => {
            const { total, percentage } = calculateOccupancy(silo.id, silo.volume_ensilado_ton_mv || 0);
            const diasRestantes = null;

            const progressLabel = `${silo.nome}: ${silo.tipo} — Volume: ${silo.volume_ensilado_ton_mv ?? 'N/A'} ton`;

            return (
              <Card key={silo.id} aria-label={`Silo ${silo.nome}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold">
                    {silo.nome}
                  </CardTitle>
                  <Database className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo: {silo.tipo}</span>
                      <Badge
                        variant={
                          percentage > 90
                            ? 'destructive'
                            : percentage < 10
                            ? 'outline'
                            : 'secondary'
                        }
                        aria-label={`Ocupação: ${percentage} por cento`}
                      >
                        {percentage}% ocupado
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs" aria-hidden="true">
                        <span>{total.toFixed(1)} ton</span>
                        <span>{silo.volume_ensilado_ton_mv || 'N/A'} ton</span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        aria-label={progressLabel}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>

                    <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>MS: {silo.materia_seca_percent || '-'}%</div>
                      <div>Volume: {silo.volume_ensilado_ton_mv || '-'} t</div>
                    </div>

                    {custos[silo.id] && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs font-bold text-primary dark:text-primary">
                          <DollarSign className="w-3 h-3" aria-hidden="true" />
                          Custo Produção:
                        </div>
                        <span className="text-xs font-black text-primary dark:text-primary">
                          R${' '}
                          {custos[silo.id]?.custoPorTonelada.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          /ton
                        </span>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Estado vazio */}
          {silos.length === 0 && !loading && (
            <Card
              className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed"
              role="status"
              aria-label="Nenhum silo cadastrado"
            >
              <Database
                className="h-12 w-12 text-muted-foreground mb-4 opacity-20"
                aria-hidden="true"
              />
              <CardTitle className="text-muted-foreground">Nenhum silo cadastrado</CardTitle>
              <CardDescription>
                Clique em &quot;Novo Silo&quot; para começar a gerenciar seu armazenamento.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      {/* ── Tabela de Movimentações ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle id="tabela-mov-title">Histórico de Movimentações</CardTitle>
          <CardDescription>Últimos registros de entrada e saída de silagem.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table aria-labelledby="tabela-mov-title">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Data</TableHead>
                <TableHead scope="col">Silo</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col">Quantidade</TableHead>
                <TableHead scope="col">Responsável</TableHead>
                <TableHead scope="col">Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>
                    {format(new Date(mov.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {silos.find((s) => s.id === mov.silo_id)?.nome || 'Silo removido'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {mov.tipo === 'Entrada' ? (
                        <ArrowDownRight
                          className="h-4 w-4 text-primary dark:text-primary"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpRight
                          className="h-4 w-4 text-secondary dark:text-secondary"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          mov.tipo === 'Entrada'
                            ? 'text-primary dark:text-primary font-medium'
                            : 'text-secondary dark:text-secondary font-medium'
                        }
                      >
                        {mov.tipo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{mov.quantidade} ton</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {mov.observacao}
                  </TableCell>
                </TableRow>
              ))}

              {/* Estado vazio da tabela */}
              {movimentacoes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
