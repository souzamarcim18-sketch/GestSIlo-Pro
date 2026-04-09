'use client';

import { useState, useEffect, useCallback, useMemo, useId } from 'react';
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
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
// ✅ Fix: importa o tipo correto do Recharts para o formatter
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import {
  Plus, TrendingUp, TrendingDown, Wallet,
  Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Financeiro } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  getLancamentosByFazenda,
  createLancamento,
  updateLancamento,
  deleteLancamento,
  getCategoriasByFazenda,
  calcularResumo,
  calcularFluxoMensal,
} from '@/lib/supabase/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Schema Zod
// ---------------------------------------------------------------------------
const REFERENCIA_TIPOS = ['Silo', 'Talhão', 'Máquina'] as const;

const lancamentoSchema = z.object({
  tipo: z.enum(['Receita', 'Despesa']),
  descricao: z.string().min(2, 'Descrição deve ter ao menos 2 caracteres'),
  categoria: z.string().min(1, 'Informe a categoria'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  data: z.string().min(1, 'Informe a data'),
  forma_pagamento: z.string().optional(),
  referencia_tipo: z.enum(REFERENCIA_TIPOS).optional().nullable(),
});

type LancamentoFormData = z.infer<typeof lancamentoSchema>;

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ✅ Fix principal: usa os tipos nativos do Recharts (ValueType inclui
//    number | string | readonly (string|number)[] | undefined)
//    Retorna [string, NameType] para o Recharts renderizar corretamente
const tooltipFormatter = (
  value: ValueType | undefined,
  name: NameType | undefined,
): [string, NameType] => {
  const formatted = typeof value === 'number' ? brl(value) : String(value ?? '');
  return [formatted, (name ?? '') as NameType];
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function FinanceiroPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Financeiro | null>(null);
  const [deletingLancamento, setDeletingLancamento] = useState<Financeiro | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const uid = useId();
  const ids = {
    dialogTitle:  `${uid}-dialog-title`,
    dialogDesc:   `${uid}-dialog-desc`,
    formTipo:     `${uid}-tipo`,
    formValor:    `${uid}-valor`,
    formDesc:     `${uid}-desc`,
    formCat:      `${uid}-cat`,
    formData:     `${uid}-data`,
    formPag:      `${uid}-pag`,
    formRef:      `${uid}-ref`,
    filtroInicio: `${uid}-filtro-inicio`,
    filtroFim:    `${uid}-filtro-fim`,
  };

  const form = useForm<LancamentoFormData>({
    // ✅ Fix: remove o "as any" — zodResolver é genérico o suficiente aqui
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      tipo: 'Despesa',
      descricao: '',
      categoria: '',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      forma_pagamento: '',
      referencia_tipo: null,
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async (fid: string) => {
    try {
      const [dados, cats] = await Promise.all([
        getLancamentosByFazenda(fid),
        getCategoriasByFazenda(fid),
      ]);
      setLancamentos(dados);
      setCategorias(cats);
    } catch {
      toast.error('Erro ao carregar dados financeiros.');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!fazendaId) { setLoading(false); return; }
    setLoading(true);
    fetchData(fazendaId).finally(() => setLoading(false));
  }, [authLoading, fazendaId, fetchData]);

  // ---------------------------------------------------------------------------
  // Dados derivados
  // ---------------------------------------------------------------------------
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroInicio && l.data < filtroInicio) return false;
      if (filtroFim   && l.data > filtroFim)     return false;
      return true;
    });
  }, [lancamentos, filtroInicio, filtroFim]);

  const resumo      = useMemo(() => calcularResumo(lancamentosFiltrados), [lancamentosFiltrados]);
  const fluxoMensal = useMemo(() => calcularFluxoMensal(lancamentos, 6), [lancamentos]);
  const receitas    = useMemo(() => lancamentosFiltrados.filter((l) => l.tipo === 'Receita'), [lancamentosFiltrados]);
  const despesas    = useMemo(() => lancamentosFiltrados.filter((l) => l.tipo === 'Despesa'), [lancamentosFiltrados]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleOpenNew = () => {
    setEditingLancamento(null);
    reset({
      tipo: 'Despesa', descricao: '', categoria: '', valor: 0,
      data: new Date().toISOString().split('T')[0],
      forma_pagamento: '', referencia_tipo: null,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (l: Financeiro) => {
    setEditingLancamento(l);
    reset({
      tipo: l.tipo,
      descricao: l.descricao,
      categoria: l.categoria,
      valor: l.valor,
      data: l.data,
      forma_pagamento: l.forma_pagamento ?? '',
      referencia_tipo: l.referencia_tipo ?? null,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (data: LancamentoFormData) => {
    if (!fazendaId) return;
    setSubmitting(true);
    try {
      if (editingLancamento) {
        await updateLancamento(editingLancamento.id, data);
        toast.success('Lançamento atualizado.');
      } else {
        await createLancamento({
          ...data,
          fazenda_id: fazendaId,
          referencia_id: null,
          referencia_tipo: data.referencia_tipo ?? null,
          forma_pagamento: data.forma_pagamento ?? null,
        });
        toast.success('Lançamento registrado.');
      }
      setIsFormOpen(false);
      setEditingLancamento(null);
      await fetchData(fazendaId);
    } catch (err: unknown) {
      // ✅ Fix: substitui "err: any" por "err: unknown" + type guard
      const msg = err instanceof Error ? err.message : 'Erro ao salvar lançamento.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLancamento || !fazendaId) return;
    setSubmitting(true);
    try {
      await deleteLancamento(deletingLancamento.id);
      toast.success('Lançamento removido.');
      setDeletingLancamento(null);
      await fetchData(fazendaId);
    } catch (err: unknown) {
      // ✅ Fix: substitui "err: any" por "err: unknown" + type guard
      const msg = err instanceof Error ? err.message : 'Erro ao remover lançamento.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Form reutilizável (add + edit)
  // ---------------------------------------------------------------------------
  const formNode = (
    <form
      onSubmit={handleSubmit(handleSave)}
      className="space-y-4 py-2"
      aria-labelledby={ids.dialogTitle}
      noValidate
    >
      <div className="grid grid-cols-2 gap-4">

        {/* Tipo */}
        <div className="space-y-1">
          <Label htmlFor={ids.formTipo}>Tipo</Label>
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={ids.formTipo}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Valor */}
        <div className="space-y-1">
          <Label htmlFor={ids.formValor}>Valor (R$)</Label>
          <Input
            id={ids.formValor}
            type="number"
            step="0.01"
            min="0"
            aria-required="true"
            aria-invalid={!!errors.valor}
            aria-describedby={errors.valor ? `${ids.formValor}-err` : undefined}
            {...register('valor', { valueAsNumber: true })}
          />
          {errors.valor && (
            <p id={`${ids.formValor}-err`} className="text-xs text-destructive" role="alert">
              {errors.valor.message}
            </p>
          )}
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Label htmlFor={ids.formDesc}>Descrição</Label>
        <Input
          id={ids.formDesc}
          placeholder="Ex: Venda de milho, Compra de defensivo..."
          aria-required="true"
          aria-invalid={!!errors.descricao}
          aria-describedby={errors.descricao ? `${ids.formDesc}-err` : undefined}
          {...register('descricao')}
        />
        {errors.descricao && (
          <p id={`${ids.formDesc}-err`} className="text-xs text-destructive" role="alert">
            {errors.descricao.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* Categoria */}
        <div className="space-y-1">
          <Label htmlFor={ids.formCat}>Categoria</Label>
          <Input
            id={ids.formCat}
            placeholder="Ex: Insumos, Venda Produção..."
            list="categorias-list"
            aria-required="true"
            aria-invalid={!!errors.categoria}
            aria-describedby={errors.categoria ? `${ids.formCat}-err` : undefined}
            {...register('categoria')}
          />
          <datalist id="categorias-list">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
          {errors.categoria && (
            <p id={`${ids.formCat}-err`} className="text-xs text-destructive" role="alert">
              {errors.categoria.message}
            </p>
          )}
        </div>

        {/* Data */}
        <div className="space-y-1">
          <Label htmlFor={ids.formData}>Data</Label>
          <Input
            id={ids.formData}
            type="date"
            aria-required="true"
            aria-invalid={!!errors.data}
            aria-describedby={errors.data ? `${ids.formData}-err` : undefined}
            {...register('data')}
          />
          {errors.data && (
            <p id={`${ids.formData}-err`} className="text-xs text-destructive" role="alert">
              {errors.data.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* Forma de pagamento */}
        <div className="space-y-1">
          <Label htmlFor={ids.formPag}>Forma de Pagamento</Label>
          <Input
            id={ids.formPag}
            placeholder="Ex: Pix, Boleto..."
            {...register('forma_pagamento')}
          />
        </div>

        {/* Vincular a */}
        <div className="space-y-1">
          <Label htmlFor={ids.formRef}>Vincular a</Label>
          <Controller
            name="referencia_tipo"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
              >
                <SelectTrigger id={ids.formRef}>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {REFERENCIA_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
          onClick={() => setIsFormOpen(false)}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : editingLancamento ? 'Atualizar' : 'Lançar'}
        </Button>
      </DialogFooter>
    </form>
  );

  // ---------------------------------------------------------------------------
  // Linha de tabela
  // ---------------------------------------------------------------------------
  const LancamentoRow = ({ l }: { l: Financeiro }) => (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        {format(new Date(l.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
      </TableCell>
      <TableCell className="font-medium max-w-[200px] truncate">{l.descricao}</TableCell>
      <TableCell><Badge variant="outline">{l.categoria}</Badge></TableCell>
      <TableCell>
        {l.referencia_tipo
          ? <span className="text-xs text-muted-foreground">{l.referencia_tipo}</span>
          : <span className="text-muted-foreground" aria-hidden="true">—</span>}
      </TableCell>
      <TableCell
        className={`font-bold tabular-nums ${l.tipo === 'Receita' ? 'text-green-600' : 'text-destructive'}`}
        aria-label={`${l.tipo === 'Receita' ? 'Receita' : 'Despesa'} de ${brl(l.valor)}`}
      >
        {l.tipo === 'Receita' ? '+' : '−'} {brl(l.valor)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {l.forma_pagamento ?? <span aria-hidden="true">—</span>}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleOpenEdit(l)}
            aria-label={`Editar lançamento: ${l.descricao}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingLancamento(l)}
            aria-label={`Excluir lançamento: ${l.descricao}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const TabelaVazia = ({ cols = 7 }: { cols?: number }) => (
    <TableRow>
      <TableCell
        colSpan={cols}
        className="text-center py-10 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Nenhum lançamento encontrado.
      </TableCell>
    </TableRow>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>

        <div className="flex flex-wrap gap-2 items-center">

          <div className="flex items-center gap-2 text-sm" role="group" aria-label="Filtro de período">
            <Label htmlFor={ids.filtroInicio} className="sr-only">Data inicial do filtro</Label>
            <Input
              id={ids.filtroInicio}
              type="date"
              className="h-9 w-36"
              value={filtroInicio}
              onChange={(e) => setFiltroInicio(e.target.value)}
              aria-label="Data inicial do filtro"
            />
            <span className="text-muted-foreground" aria-hidden="true">até</span>
            <Label htmlFor={ids.filtroFim} className="sr-only">Data final do filtro</Label>
            <Input
              id={ids.filtroFim}
              type="date"
              className="h-9 w-36"
              value={filtroFim}
              onChange={(e) => setFiltroFim(e.target.value)}
              aria-label="Data final do filtro"
            />
            {(filtroInicio || filtroFim) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFiltroInicio(''); setFiltroFim(''); }}
                aria-label="Limpar filtro de período"
              >
                Limpar
              </Button>
            )}
          </div>

          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo Lançamento
          </Button>

          <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }}>
            <DialogContent aria-labelledby={ids.dialogTitle} aria-describedby={ids.dialogDesc}>
              <DialogHeader>
                <DialogTitle id={ids.dialogTitle}>
                  {editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
                </DialogTitle>
                <DialogDescription id={ids.dialogDesc}>
                  {editingLancamento
                    ? 'Atualize os dados do lançamento.'
                    : 'Registre uma nova receita ou despesa.'}
                </DialogDescription>
              </DialogHeader>
              {formNode}
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* ── Cards de resumo ────────────────────────────────────────────── */}
      <section aria-labelledby="resumo-heading">
        <h2 id="resumo-heading" className="sr-only">Resumo financeiro</h2>
        <div className="grid gap-4 md:grid-cols-3">

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" id="card-receitas">Total Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" aria-labelledby="card-receitas" aria-live="polite">
                {loading ? '—' : brl(resumo.totalReceitas)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filtroInicio || filtroFim ? 'No período filtrado' : 'Total acumulado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" id="card-despesas">Total Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" aria-labelledby="card-despesas" aria-live="polite">
                {loading ? '—' : brl(resumo.totalDespesas)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filtroInicio || filtroFim ? 'No período filtrado' : 'Total acumulado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" id="card-saldo">Saldo Líquido</CardTitle>
              <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}
                aria-labelledby="card-saldo"
                aria-live="polite"
              >
                {loading ? '—' : brl(resumo.saldo)}
              </div>
              <p className="text-xs text-muted-foreground">Resultado operacional</p>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* ── Gráfico ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle id="grafico-titulo">Fluxo de Caixa Mensal</CardTitle>
          <CardDescription>Comparativo de receitas e despesas nos últimos 6 meses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="h-[280px]"
            role="img"
            aria-labelledby="grafico-titulo"
            aria-label="Gráfico de área com fluxo de caixa mensal — receitas e despesas nos últimos 6 meses"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  width={56}
                />
                {/* ✅ Fix principal: formatter tipado corretamente */}
                <Tooltip formatter={tooltipFormatter} labelStyle={{ fontWeight: 600 }} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="receita" name="Receita"
                  stroke="hsl(var(--primary))" fill="url(#gradReceita)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="despesa" name="Despesa"
                  stroke="#ef4444" fill="url(#gradDespesa)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela de lançamentos ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle id="lancamentos-titulo">Lançamentos</CardTitle>
          <CardDescription aria-live="polite">
            {lancamentosFiltrados.length} registro{lancamentosFiltrados.length !== 1 ? 's' : ''}
            {(filtroInicio || filtroFim) ? ' no período filtrado' : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos">
            <TabsList className="mb-4">
              <TabsTrigger value="todos" aria-label={`Todos os lançamentos: ${lancamentosFiltrados.length}`}>
                Todos ({lancamentosFiltrados.length})
              </TabsTrigger>
              <TabsTrigger value="receitas" aria-label={`Receitas: ${receitas.length}`}>
                Receitas ({receitas.length})
              </TabsTrigger>
              <TabsTrigger value="despesas" aria-label={`Despesas: ${despesas.length}`}>
                Despesas ({despesas.length})
              </TabsTrigger>
            </TabsList>

            {(['todos', 'receitas', 'despesas'] as const).map((aba) => {
              const lista =
                aba === 'todos'    ? lancamentosFiltrados :
                aba === 'receitas' ? receitas : despesas;

              const labelMap = {
                todos:    'Todos os lançamentos',
                receitas: 'Lançamentos de receitas',
                despesas: 'Lançamentos de despesas',
              };

              return (
                <TabsContent key={aba} value={aba}>
                  <Table aria-label={labelMap[aba]}>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Data</TableHead>
                        <TableHead scope="col">Descrição</TableHead>
                        <TableHead scope="col">Categoria</TableHead>
                        <TableHead scope="col">Referência</TableHead>
                        <TableHead scope="col">Valor</TableHead>
                        <TableHead scope="col">Pagamento</TableHead>
                        <TableHead scope="col" className="w-[80px]">
                          <span className="sr-only">Ações</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lista.length === 0
                        ? <TabelaVazia />
                        : lista.map((l) => <LancamentoRow key={l.id} l={l} />)
                      }
                    </TableBody>
                  </Table>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Dialog: Confirmar exclusão ─────────────────────────────────── */}
      <Dialog
        open={!!deletingLancamento}
        onOpenChange={(open) => { if (!open) setDeletingLancamento(null); }}
      >
        <DialogContent aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-desc">
          <DialogHeader>
            <DialogTitle id="delete-dialog-title">Confirmar exclusão</DialogTitle>
            <DialogDescription id="delete-dialog-desc">
              Remover o lançamento{' '}
              <strong>&quot;{deletingLancamento?.descricao}&quot;</strong>{' '}
              de <strong>{deletingLancamento ? brl(deletingLancamento.valor) : ''}</strong>?
              Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingLancamento(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
