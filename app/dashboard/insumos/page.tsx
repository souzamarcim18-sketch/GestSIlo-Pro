'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Package, ArrowDownRight, ArrowUpRight,
  AlertTriangle, Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Insumo, MovimentacaoInsumo } from '@/lib/supabase';
import {
  getInsumosByFazenda,
  createInsumo,
  updateInsumo,
  deleteInsumo,
  createMovimentacaoInsumo,
  getTodasMovimentacoesByFazenda,
} from '@/lib/supabase/insumos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Schemas Zod (serão extraídos para /lib/validations/insumos.ts no arquivo 5)
// ---------------------------------------------------------------------------
const TIPOS_INSUMO = ['Fertilizante', 'Defensivo', 'Semente', 'Combustível', 'Outros'] as const;

const insumoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tipo: z.enum(TIPOS_INSUMO),
  unidade: z.string().min(1, 'Informe a unidade (ex: kg, L, Saco)'),
  estoque_minimo: z.coerce.number().min(0, 'Estoque mínimo não pode ser negativo'),
  estoque_atual: z.coerce.number().min(0, 'Estoque inicial não pode ser negativo'),
  teor_n_percent: z.coerce.number().min(0).max(100).optional(),
  teor_p_percent: z.coerce.number().min(0).max(100).optional(),
  teor_k_percent: z.coerce.number().min(0).max(100).optional(),
});

const movimentacaoSchema = z.object({
  insumo_id: z.string().min(1, 'Selecione um insumo'),
  tipo: z.enum(['Entrada', 'Saída']),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  valor_unitario: z.coerce.number().min(0).optional(),
  destino: z.string().min(1, 'Informe o destino ou fornecedor'),
  responsavel: z.string().min(1, 'Informe o responsável'),
  data: z.string().min(1, 'Informe a data'),
});

type InsumoFormData = z.infer<typeof insumoSchema>;
type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;

// ---------------------------------------------------------------------------
// Tipo auxiliar para movimentações com nome do insumo inlined
// ---------------------------------------------------------------------------
type MovComNome = MovimentacaoInsumo & { insumo_nome: string; insumo_unidade: string };

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function InsumosPage() {
  const [fazendaId, setFazendaId] = useState<string | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovComNome[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [isAddInsumoOpen, setIsAddInsumoOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null);
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const insumoForm = useForm<InsumoFormData>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      nome: '', tipo: 'Fertilizante', unidade: '',
      estoque_minimo: 0, estoque_atual: 0,
    },
  });

  const movForm = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: {
      insumo_id: '', tipo: 'Saída',
      quantidade: 0, valor_unitario: 0,
      destino: '', responsavel: '',
      data: new Date().toISOString().split('T')[0],
    },
  });

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async (fid: string) => {
    try {
      const [insumosData, movsData] = await Promise.all([
        getInsumosByFazenda(fid),
        getTodasMovimentacoesByFazenda(fid),
      ]);
      setInsumos(insumosData);
      setMovimentacoes(movsData);
    } catch {
      toast.error('Erro ao carregar dados de insumos.');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('fazenda_id')
          .eq('id', user.id)
          .single();
        if (profile?.fazenda_id) {
          setFazendaId(profile.fazenda_id);
          await fetchData(profile.fazenda_id);
        }
      } catch {
        toast.error('Erro ao inicializar a página.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Handlers — Insumo
  // ---------------------------------------------------------------------------
  const handleSaveInsumo = async (data: InsumoFormData) => {
    if (!fazendaId) return;
    setSubmitting(true);
    try {
      if (editingInsumo) {
        await updateInsumo(editingInsumo.id, data);
        toast.success('Insumo atualizado com sucesso.');
        setEditingInsumo(null);
      } else {
        await createInsumo({ ...data, fazenda_id: fazendaId });
        toast.success('Insumo cadastrado com sucesso.');
        setIsAddInsumoOpen(false);
      }
      insumoForm.reset();
      await fetchData(fazendaId);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar insumo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    insumoForm.reset({
      nome: insumo.nome,
      tipo: insumo.tipo,
      unidade: insumo.unidade,
      estoque_minimo: insumo.estoque_minimo,
      estoque_atual: insumo.estoque_atual,
      teor_n_percent: insumo.teor_n_percent ?? 0,
      teor_p_percent: insumo.teor_p_percent ?? 0,
      teor_k_percent: insumo.teor_k_percent ?? 0,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingInsumo || !fazendaId) return;
    setSubmitting(true);
    try {
      await deleteInsumo(deletingInsumo.id);
      toast.success(`"${deletingInsumo.nome}" removido.`);
      setDeletingInsumo(null);
      await fetchData(fazendaId);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao remover insumo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handler — Movimentação
  // ---------------------------------------------------------------------------
  const handleSaveMovimentacao = async (data: MovimentacaoFormData) => {
    setSubmitting(true);
    try {
      await createMovimentacaoInsumo({
        insumo_id: data.insumo_id,
        tipo: data.tipo,
        quantidade: data.quantidade,
        valor_unitario: data.valor_unitario ?? null,
        destino: data.destino,
        responsavel: data.responsavel,
        data: data.data,
      });
      toast.success('Movimentação registrada com sucesso.');
      setIsAddMovOpen(false);
      movForm.reset({
        insumo_id: '', tipo: 'Saída', quantidade: 0, valor_unitario: 0,
        destino: '', responsavel: '', data: new Date().toISOString().split('T')[0],
      });
      if (fazendaId) await fetchData(fazendaId);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao registrar movimentação.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const insumosPorTipo = TIPOS_INSUMO.map((tipo) => ({
    tipo,
    count: insumos.filter((i) => i.tipo === tipo).length,
    criticos: insumos.filter((i) => i.tipo === tipo && i.estoque_atual < i.estoque_minimo).length,
  }));

  const totalCriticos = insumos.filter((i) => i.estoque_atual < i.estoque_minimo).length;

  const formInsumo = (
    <form onSubmit={insumoForm.handleSubmit(handleSaveInsumo)} className="space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome do Insumo</Label>
        <Input id="nome" placeholder="Ex: Adubo NPK 04-14-08" {...insumoForm.register('nome')} />
        {insumoForm.formState.errors.nome && (
          <p className="text-xs text-destructive">{insumoForm.formState.errors.nome.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Controller name="tipo" control={insumoForm.control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_INSUMO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unidade">Unidade</Label>
          <Input id="unidade" placeholder="kg, L, Saco..." {...insumoForm.register('unidade')} />
          {insumoForm.formState.errors.unidade && (
            <p className="text-xs text-destructive">{insumoForm.formState.errors.unidade.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
          <Input id="estoque_minimo" type="number" step="0.01" {...insumoForm.register('estoque_minimo')} />
          {insumoForm.formState.errors.estoque_minimo && (
            <p className="text-xs text-destructive">{insumoForm.formState.errors.estoque_minimo.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="estoque_atual">Estoque Atual</Label>
          <Input id="estoque_atual" type="number" step="0.01" {...insumoForm.register('estoque_atual')} />
          {insumoForm.formState.errors.estoque_atual && (
            <p className="text-xs text-destructive">{insumoForm.formState.errors.estoque_atual.message}</p>
          )}
        </div>
      </div>

      {/* Campos NPK — visíveis apenas para Fertilizante */}
      {insumoForm.watch('tipo') === 'Fertilizante' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="n">% N</Label>
            <Input id="n" type="number" step="0.01" placeholder="0" {...insumoForm.register('teor_n_percent')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p">% P₂O₅</Label>
            <Input id="p" type="number" step="0.01" placeholder="0" {...insumoForm.register('teor_p_percent')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="k">% K₂O</Label>
            <Input id="k" type="number" step="0.01" placeholder="0" {...insumoForm.register('teor_k_percent')} />
          </div>
        </div>
      )}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : editingInsumo ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </form>
  );

  // ---------------------------------------------------------------------------
  // JSX principal
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estoque de Insumos</h2>
          {totalCriticos > 0 && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              {totalCriticos} insumo{totalCriticos > 1 ? 's' : ''} abaixo do estoque mínimo
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Botão Movimentação */}
          <Dialog open={isAddMovOpen} onOpenChange={(open) => {
            setIsAddMovOpen(open);
            if (!open) movForm.reset({
              insumo_id: '', tipo: 'Saída', quantidade: 0, valor_unitario: 0,
              destino: '', responsavel: '', data: new Date().toISOString().split('T')[0],
            });
          }}>
            <DialogTrigger render={
              <Button variant="outline">
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Registrar Movimentação
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Movimentação de Insumo</DialogTitle>
                <DialogDescription>Registre a entrada ou saída de materiais do estoque.</DialogDescription>
              </DialogHeader>
              <form onSubmit={movForm.handleSubmit(handleSaveMovimentacao)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Insumo</Label>
                    <Controller name="insumo_id" control={movForm.control} render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {insumos.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nome} ({i.estoque_atual} {i.unidade})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                    {movForm.formState.errors.insumo_id && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.insumo_id.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Controller name="tipo" control={movForm.control} render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Entrada">Entrada (Compra)</SelectItem>
                          <SelectItem value="Saída">Saída (Uso)</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="mov-qty">Quantidade</Label>
                    <Input id="mov-qty" type="number" step="0.01" {...movForm.register('quantidade')} />
                    {movForm.formState.errors.quantidade && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.quantidade.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mov-valor">Valor Unitário (R$)</Label>
                    <Input id="mov-valor" type="number" step="0.01" placeholder="0,00" {...movForm.register('valor_unitario')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="mov-dest">Destino / Fornecedor</Label>
                    <Input id="mov-dest" placeholder="Ex: Talhão 02 ou AgroSementes" {...movForm.register('destino')} />
                    {movForm.formState.errors.destino && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.destino.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mov-resp">Responsável</Label>
                    <Input id="mov-resp" {...movForm.register('responsavel')} />
                    {movForm.formState.errors.responsavel && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.responsavel.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mov-data">Data</Label>
                  <Input id="mov-data" type="date" {...movForm.register('data')} />
                </div>

                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Registrando...' : 'Registrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Botão Novo Insumo */}
          <Dialog open={isAddInsumoOpen} onOpenChange={(open) => {
            setIsAddInsumoOpen(open);
            if (!open) { insumoForm.reset(); }
          }}>
            <DialogTrigger render={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Insumo
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Insumo</DialogTitle>
                <DialogDescription>Adicione um item ao catálogo de estoque.</DialogDescription>
              </DialogHeader>
              {formInsumo}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de estoque */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-5 bg-muted rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-1/2 mt-2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : insumos.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-muted-foreground">Nenhum insumo cadastrado</CardTitle>
          <CardDescription>Clique em &quot;Novo Insumo&quot; para começar.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {insumos.map((insumo) => {
            const isLow = insumo.estoque_atual < insumo.estoque_minimo;
            const pct = insumo.estoque_minimo > 0
              ? Math.min(Math.round((insumo.estoque_atual / (insumo.estoque_minimo * 2)) * 100), 100)
              : 100;
            return (
              <Card key={insumo.id} className={isLow ? 'border-destructive/50' : ''}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold leading-tight">{insumo.nome}</CardTitle>
                    <span className="text-xs text-muted-foreground">{insumo.tipo}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {/* Botão editar */}
                    <Dialog open={editingInsumo?.id === insumo.id} onOpenChange={(open) => {
                      if (!open) { setEditingInsumo(null); insumoForm.reset(); }
                    }}>
                      <DialogTrigger render={
                        <Button variant="ghost" size="icon-sm" onClick={() => handleOpenEdit(insumo)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      } />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Insumo</DialogTitle>
                          <DialogDescription>Atualize os dados de &quot;{insumo.nome}&quot;.</DialogDescription>
                        </DialogHeader>
                        {formInsumo}
                      </DialogContent>
                    </Dialog>

                    {/* Botão deletar */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingInsumo(insumo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLow && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="w-3 h-3" /> Estoque Crítico
                      </Badge>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={isLow ? 'text-destructive font-bold' : 'font-medium'}>
                          {insumo.estoque_atual} {insumo.unidade}
                        </span>
                        <span className="text-muted-foreground">
                          Mín: {insumo.estoque_minimo} {insumo.unidade}
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    {insumo.tipo === 'Fertilizante' && (insumo.teor_n_percent || insumo.teor_p_percent || insumo.teor_k_percent) ? (
                      <p className="text-xs text-muted-foreground">
                        NPK: {insumo.teor_n_percent ?? 0}-{insumo.teor_p_percent ?? 0}-{insumo.teor_k_percent ?? 0}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Histórico de movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>Entradas e saídas do estoque registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Destino / Origem</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(mov.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{mov.insumo_nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {mov.tipo === 'Entrada' ? (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={mov.tipo === 'Entrada' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                        {mov.tipo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">
                    {mov.quantidade} {mov.insumo_unidade}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mov.destino ?? '—'}</TableCell>
                  <TableCell>
                    {mov.valor_unitario != null
                      ? `R$ ${mov.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                  <TableCell>{mov.responsavel ?? '—'}</TableCell>
                </TableRow>
              ))}
              {movimentacoes.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhuma movimentação registrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deletingInsumo} onOpenChange={(open) => { if (!open) setDeletingInsumo(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>&quot;{deletingInsumo?.nome}&quot;</strong>?
              Todo o histórico de movimentações deste insumo também será excluído. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
