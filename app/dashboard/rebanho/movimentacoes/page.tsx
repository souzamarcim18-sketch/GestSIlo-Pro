'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { queryMovimentacoes, type MovimentacaoListItem, type TipoMovimentacao } from '@/lib/supabase/rebanho-movimentacoes';
import { listLotes } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';
import { formatDate, formatBRL } from '@/lib/utils';
import RegistrarMovimentacaoDialog from './components/RegistrarMovimentacaoDialog';

export default function MovimentacoesPage() {
  const { loading: authLoading, profile } = useAuth();

  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoListItem[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtros
  const [periodo, setPeriodo] = useState<'mes' | '3meses' | '12meses' | 'custom'>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimentacao | ''>('');
  const [loteFiltro, setLoteFiltro] = useState<string | null>('');
  const [buscaBrinco, setBuscaBrinco] = useState('');

  const isAdmin = profile?.perfil === 'Administrador';

  // Calcular datas baseado no período
  const datas = useMemo(() => {
    const hoje = new Date();
    const fim = hoje.toISOString().split('T')[0];
    let inicio = '';

    switch (periodo) {
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        break;
      case '3meses':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate()).toISOString().split('T')[0];
        break;
      case '12meses':
        inicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()).toISOString().split('T')[0];
        break;
      case 'custom':
        inicio = dataInicio;
        break;
    }

    return {
      inicio,
      fim: periodo === 'custom' ? dataFim : fim,
    };
  }, [periodo, dataInicio, dataFim]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar lotes
      const lotesData = await listLotes(100, 0);
      setLotes(lotesData);

      // Buscar movimentações
      const { data, total: totalMovimentacoes } = await queryMovimentacoes.list(
        {
          tipo: tipoFiltro || undefined,
          data_inicio: datas.inicio,
          data_fim: datas.fim,
          lote_id: loteFiltro || undefined,
          busca: buscaBrinco || undefined,
        },
        25,
        page * 25
      );

      setMovimentacoes(data);
      setTotal(totalMovimentacoes);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  }, [page, tipoFiltro, datas, loteFiltro, buscaBrinco]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  // Resumo do período
  const resumo = useMemo(async () => {
    try {
      return await queryMovimentacoes.getResumo(datas.inicio, datas.fim);
    } catch (err) {
      return { entradas: 0, saidas: 0, saldo: 0, valor_vendas: 0 };
    }
  }, [datas]);

  const [resumoData, setResumoData] = useState({ entradas: 0, saidas: 0, saldo: 0, valor_vendas: 0 });

  useEffect(() => {
    resumo.then(setResumoData);
  }, [resumo]);

  // Exportar CSV
  const handleExportarCSV = () => {
    const csv = [
      ['Data', 'Tipo', 'Brinco', 'Nome', 'Categoria', 'Detalhes', 'Valor (R$)'].join(','),
      ...movimentacoes.map((m) => [
        formatDate(m.data_evento),
        m.tipo,
        m.brinco,
        m.nome || '',
        m.categoria,
        getDetalhes(m),
        m.tipo === 'venda' ? formatBRL(m.valor_venda || 0) : '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes-${formatDate(new Date().toISOString())}.csv`;
    a.click();
  };

  const getDetalhes = (m: MovimentacaoListItem): string => {
    switch (m.tipo) {
      case 'venda':
        return `Comprador: ${m.comprador}`;
      case 'morte':
        return `Causa: ${m.observacoes || ''}`;
      case 'transferencia_lote':
        return `Lote: ${m.lote_nome}`;
      case 'descarte':
        return `Motivo: ${m.motivo_descarte}`;
      default:
        return m.observacoes || '';
    }
  };

  const getBadgeColor = (tipo: TipoMovimentacao) => {
    switch (tipo) {
      case 'nascimento':
        return 'bg-green-100 text-green-800';
      case 'compra':
        return 'bg-blue-100 text-blue-800';
      case 'venda':
        return 'bg-emerald-100 text-emerald-800';
      case 'morte':
        return 'bg-red-100 text-red-800';
      case 'descarte':
        return 'bg-orange-100 text-orange-800';
      case 'transferencia_lote':
        return 'bg-gray-100 text-gray-800';
      case 'abate_proprio':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = (tipo: TipoMovimentacao) => {
    const labels: Record<TipoMovimentacao, string> = {
      nascimento: 'Nascimento',
      compra: 'Compra',
      venda: 'Venda',
      morte: 'Morte',
      descarte: 'Descarte',
      transferencia_lote: 'Transferência',
      abate_proprio: 'Abate Próprio',
    };
    return labels[tipo];
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Breadcrumbs />
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportarCSV} disabled={movimentacoes.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              {isAdmin && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Movimentação
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoData.entradas}</div>
              <p className="text-xs text-muted-foreground mt-1">Nascimentos + Compras</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{resumoData.saidas}</div>
              <p className="text-xs text-muted-foreground mt-1">Vendas + Mortes + Descartes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${resumoData.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {resumoData.saldo >= 0 ? '+' : ''}{resumoData.saldo}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entradas - Saídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Vendido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBRL(resumoData.valor_vendas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total em vendas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Último Mês</SelectItem>
                  <SelectItem value="3meses">Últimos 3 Meses</SelectItem>
                  <SelectItem value="12meses">Últimos 12 Meses</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {periodo === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    placeholder="Data inicial"
                    className="w-full md:w-48"
                  />
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    placeholder="Data final"
                    className="w-full md:w-48"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros Avançados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoMovimentacao | '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de movimentação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="nascimento">Nascimento</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="morte">Morte</SelectItem>
                  <SelectItem value="descarte">Descarte</SelectItem>
                  <SelectItem value="transferencia_lote">Transferência</SelectItem>
                  <SelectItem value="abate_proprio">Abate Próprio</SelectItem>
                </SelectContent>
              </Select>

              <Select value={loteFiltro} onValueChange={(v) => setLoteFiltro(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Lote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {lotes.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder="Buscar por brinco..."
                value={buscaBrinco}
                onChange={(e) => setBuscaBrinco(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="pt-6">
            {movimentacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação encontrada neste período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.data_evento)}</TableCell>
                        <TableCell>
                          <Badge className={getBadgeColor(m.tipo as TipoMovimentacao)}>
                            {getTipoLabel(m.tipo as TipoMovimentacao)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.brinco}</div>
                          <div className="text-sm text-muted-foreground">{m.nome}</div>
                        </TableCell>
                        <TableCell>{m.categoria}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getDetalhes(m)}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.tipo === 'venda' && m.valor_venda ? formatBRL(m.valor_venda) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {total > 25 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {page * 25 + 1} a {Math.min((page + 1) * 25, total)} de {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * 25 >= total}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <RegistrarMovimentacaoDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchData} />
    </div>
  );
}
