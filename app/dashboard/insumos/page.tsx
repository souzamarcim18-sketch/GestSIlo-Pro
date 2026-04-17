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
import { Insumo, MovimentacaoInsumo } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Schemas Zod (serão extraídos para /lib/validations/insumos.ts no arquivo 5)
// ---------------------------------------------------------------------------
const insumoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  categoria_id: z.string().uuid('Categoria inválida'),
  tipo_id: z.string().uuid('Tipo inválido').optional(),
  unidade: z.string().min(1, 'Informe a unidade (ex: kg, L, Saco)'),
  estoque_minimo: z.number().min(0, 'Estoque mínimo não pode ser negativo').optional(),
  estoque_atual: z.number().min(0, 'Estoque inicial não pode ser negativo'),
  teor_n_percent: z.number().min(0).max(100).optional(),
  teor_p_percent: z.number().min(0).max(100).optional(),
  teor_k_percent: z.number().min(0).max(100).optional(),
});

const movimentacaoSchema = z.object({
  insumo_id: z.string().min(1, 'Selecione um insumo'),
  tipo: z.enum(['Entrada', 'Saída', 'Ajuste']),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  valor_unitario: z.number().min(0).optional(),
  destino_tipo: z.enum(['talhao', 'maquina', 'silo']).optional(),
  destino_id: z.string().uuid().optional(),
  observacoes: z.string().optional(),
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
  const { fazendaId, loading: authLoading } = useAuth();
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
      nome: '', categoria_id: '', tipo_id: '', unidade: '',
      estoque_minimo: undefined, estoque_atual: 0,
    },
  });

  const movForm = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: {
      insumo_id: '', tipo: 'Saída',
      quantidade: 0, valor_unitario: 0,
      destino_tipo: undefined, destino_id: undefined, observacoes: '',
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
    },
  });

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    try {
      const [insumosData, movsData] = await Promise.all([
        q.insumos.list(),
        q.movimentacoesInsumo.listByFazenda(),
      ]);
      setInsumos(insumosData);
      setMovimentacoes(movsData);
    } catch {
      toast.error('Erro ao carregar dados de insumos.');
    }
  }, [fazendaId]);

  useEffect(() => {
    if (authLoading) return;
    if (!fazendaId) { setLoading(false); return; }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [authLoading, fazendaId, fetchData]);

  // ---------------------------------------------------------------------------
  // Handlers — Insumo
  // ---------------------------------------------------------------------------
  const handleSaveInsumo = async (data: InsumoFormData) => {
  setSubmitting(true);
  try {
    const payload = {
      nome: data.nome,
      categoria_id: data.categoria_id,
      tipo_id: data.tipo_id,
      unidade: data.unidade,
      estoque_atual: data.estoque_atual,
      estoque_minimo: data.estoque_minimo,
      teor_n_percent: data.teor_n_percent,
      teor_p_percent: data.teor_p_percent,
      teor_k_percent: data.teor_k_percent,
      custo_medio: 0, // valor padrão (será atualizado com primeira entrada)
      ativo: true,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    if (editingInsumo) {
      await q.insumos.update(editingInsumo.id, payload as any);
      toast.success('Insumo atualizado com sucesso.');
      setEditingInsumo(null);
    } else {
      await q.insumos.create(payload as any);
      toast.success('Insumo cadastrado com sucesso.');
      setIsAddInsumoOpen(false);
    }
    insumoForm.reset();
    await fetchData();
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Erro ao salvar insumo.');
  } finally {
    setSubmitting(false);
  }
};


  const handleOpenEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    insumoForm.reset({
      nome: insumo.nome,
      categoria_id: insumo.categoria_id || '',
      tipo_id: insumo.tipo_id,
      unidade: insumo.unidade,
      estoque_minimo: insumo.estoque_minimo,
      estoque_atual: insumo.estoque_atual,
      teor_n_percent: insumo.teor_n_percent,
      teor_p_percent: insumo.teor_p_percent,
      teor_k_percent: insumo.teor_k_percent,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingInsumo) return;
    setSubmitting(true);
    try {
      await q.insumos.delete(deletingInsumo.id);
      toast.success(`"${deletingInsumo.nome}" removido.`);
      setDeletingInsumo(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover insumo.');
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
      await q.movimentacoesInsumo.create({
        insumo_id: data.insumo_id,
        tipo: data.tipo as any,
        quantidade: data.quantidade,
        valor_unitario: data.valor_unitario,
        destino_tipo: data.destino_tipo as any,
        destino_id: data.destino_id,
        observacoes: data.observacoes,
        responsavel: data.responsavel,
        data: data.data,
        origem: 'manual',
      } as any);
      toast.success('Movimentação registrada com sucesso.');
      setIsAddMovOpen(false);
      movForm.reset({
        insumo_id: '', tipo: 'Saída', quantidade: 0, valor_unitario: 0,
        destino_tipo: undefined, destino_id: undefined, observacoes: '',
        responsavel: '', data: new Date().toISOString().split('T')[0],
      });
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar movimentação.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const totalCriticos = insumos.filter(
    (i) => i.estoque_minimo != null && i.estoque_atual < i.estoque_minimo
  ).length;

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
          <Label>Categoria</Label>
          <Controller name="categoria_id" control={insumoForm.control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {/* TODO: carregar categorias dinamicamente */}
              </SelectContent>
            </Select>
          )} />
          {insumoForm.formState.errors.categoria_id && (
            <p className="text-xs text-destructive">{insumoForm.formState.errors.categoria_id.message}</p>
          )}
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
          <Label htmlFor="estoque_minimo">
            Estoque Mínimo <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input id="estoque_minimo" type="number" step="0.01" {...insumoForm.register('estoque_minimo', { valueAsNumber: true })} />
          {insumoForm.formState.errors.estoque_minimo && (
            <p className="text-xs text-destructive">{insumoForm.formState.errors.estoque_minimo.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="estoque_atual">Estoque Atual</Label>
          <Input id="estoque_atual" type="number" step="0.01" {...insumoForm.register('estoque_atual', { valueAsNumber: true })} />
          {insumoForm.formState.errors.estoque_atual && (
            <p className="text-xs text-destructive">{insumoForm.formState.errors.estoque_atual.message}</p>
          )}
        </div>
      </div>

      {/* Campos NPK — preenchimento opcional */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="n">% N <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="n" type="number" step="0.01" placeholder="0" {...insumoForm.register('teor_n_percent', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p">% P₂O₅ <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="p" type="number" step="0.01" placeholder="0" {...insumoForm.register('teor_p_percent', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="k">% K₂O <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="k" type="number" step="0.01" placeholder="0" {...insumoForm.register('teor_k_percent', { valueAsNumber: true })} />
        </div>
      </div>

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
              destino_tipo: undefined, destino_id: undefined, observacoes: '',
              responsavel: '', data: new Date().toISOString().split('T')[0],
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
                    <Input id="mov-qty" type="number" step="0.01" {...movForm.register('quantidade', { valueAsNumber: true })} />
                    {movForm.formState.errors.quantidade && (
                      <p className="text-xs text-destructive">{movForm.formState.errors.quantidade.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mov-valor">Valor Unitário (R$)</Label>
                    <Input id="mov-valor" type="number" step="0.01" placeholder="0,00" {...movForm.register('valor_unitario', { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="mov-obs">Observações</Label>
                    <Input id="mov-obs" placeholder="Notas adicionais..." {...movForm.register('observacoes')} />
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
            const isLow = insumo.estoque_minimo != null && insumo.estoque_atual < insumo.estoque_minimo;
            const pct = insumo.estoque_minimo != null && insumo.estoque_minimo > 0
              ? Math.min(Math.round((insumo.estoque_atual / (insumo.estoque_minimo * 2)) * 100), 100)
              : 100;
            return (
              <Card key={insumo.id} className={isLow ? 'border-destructive/50' : ''}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold leading-tight">{insumo.nome}</CardTitle>
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
                        {insumo.estoque_minimo != null && (
                          <span className="text-muted-foreground">
                            Mín: {insumo.estoque_minimo} {insumo.unidade}
                          </span>
                        )}
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    {(insumo.teor_n_percent || insumo.teor_p_percent || insumo.teor_k_percent) && (
                      <p className="text-xs text-muted-foreground">
                        NPK: {insumo.teor_n_percent ?? 0}-{insumo.teor_p_percent ?? 0}-{insumo.teor_k_percent ?? 0}
                      </p>
                    )}
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
                        <ArrowDownRight className="h-4 w-4 text-primary dark:text-primary" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-secondary dark:text-secondary" />
                      )}
                      <span className={mov.tipo === 'Entrada' ? 'text-primary dark:text-primary font-medium' : 'text-secondary dark:text-secondary font-medium'}>
                        {mov.tipo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">
                    {mov.quantidade} {mov.insumo_unidade}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mov.destino_tipo ?? '—'}</TableCell>
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
