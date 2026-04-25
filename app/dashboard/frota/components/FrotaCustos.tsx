'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Maquina, type Abastecimento, type Manutencao, type UsoMaquina } from '@/lib/supabase';
import { agruparCustosPorMaquina, filtrarManutencoesPorPeriodo, type CustoMaquinaRow } from '@/lib/utils/frota';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface FrotaCustosProps {
  maquinas: Maquina[];
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
  usos: UsoMaquina[];
  loading: boolean;
}

function fmtBrl(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtH(valor: number) {
  return `${valor.toFixed(1)} h`;
}

export function FrotaCustos({
  maquinas,
  abastecimentos,
  manutencoes,
  usos,
  loading,
}: FrotaCustosProps) {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(
    startOfMonth(subMonths(hoje, 2)).toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(endOfMonth(hoje).toISOString().slice(0, 10));
  const [sortDesc, setSortDesc] = useState(true);
  const [precoMercado, setPrecoMercado] = useState('');
  const [maquinaComparativo, setMaquinaComparativo] = useState('');

  // Filtra por período sem nova query
  const manutFiltradas = useMemo(
    () => filtrarManutencoesPorPeriodo(manutencoes, new Date(dataInicio), new Date(dataFim + 'T23:59:59')),
    [manutencoes, dataInicio, dataFim]
  );

  const abastecisFiltrados = useMemo(
    () =>
      abastecimentos.filter((a) => {
        const d = new Date(a.data);
        return d >= new Date(dataInicio) && d <= new Date(dataFim + 'T23:59:59');
      }),
    [abastecimentos, dataInicio, dataFim]
  );

  const usosFiltrados = useMemo(
    () =>
      usos.filter((u) => {
        const d = new Date(u.data);
        return d >= new Date(dataInicio) && d <= new Date(dataFim + 'T23:59:59');
      }),
    [usos, dataInicio, dataFim]
  );

  const rows: CustoMaquinaRow[] = useMemo(
    () => agruparCustosPorMaquina(maquinas, abastecisFiltrados, manutFiltradas, usosFiltrados),
    [maquinas, abastecisFiltrados, manutFiltradas, usosFiltrados]
  );

  const rowsSorted = useMemo(
    () => (sortDesc ? [...rows] : [...rows].reverse()),
    [rows, sortDesc]
  );

  const temValorAquisicao = maquinas.some((m) => m.valor_aquisicao);

  // Comparativo de terceirização
  const precoMercadoNum = parseFloat(precoMercado) || 0;
  const rowComparativo = maquinaComparativo
    ? rowsSorted.find((r) => r.maquina.id === maquinaComparativo)
    : null;
  const diferencaComparativo =
    rowComparativo && precoMercadoNum > 0
      ? precoMercadoNum - rowComparativo.custoHora.total
      : null;

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!temValorAquisicao && maquinas.length > 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
          <p className="text-lg font-semibold text-muted-foreground">Dados insuficientes</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Cadastre máquinas com valor de aquisição para ver a análise de custo por hora.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (maquinas.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
          <p className="text-lg font-semibold text-muted-foreground">Nenhuma máquina cadastrada</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Cadastre máquinas na aba Cadastro para ver a análise de custos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Filtro de período ───────────────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Período de análise</CardTitle>
          <CardDescription>Os dados são refiltrados localmente — sem nova consulta ao banco.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="custo-inicio">Data inicial</Label>
              <Input
                id="custo-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custo-fim">Data final</Label>
              <Input
                id="custo-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela de custo por máquina ─────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle id="custo-titulo">Custo por Máquina</CardTitle>
            <CardDescription>Análise de custo operacional por hora trabalhada (R$/h)</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortDesc((d) => !d)}
            className="gap-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            {sortDesc ? 'Mais caro primeiro' : 'Mais barato primeiro'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table aria-labelledby="custo-titulo">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Deprec./h</TableHead>
                  <TableHead className="text-right">Comb./h</TableHead>
                  <TableHead className="text-right">Manut./h</TableHead>
                  <TableHead className="text-right font-bold">Total R$/h</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsSorted.map((row) => (
                  <TableRow key={row.maquina.id}>
                    <TableCell>
                      <Badge variant="outline">#{row.ranking}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{row.maquina.nome}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{row.maquina.tipo}</span>
                    </TableCell>
                    <TableCell className="text-right">{fmtH(row.horasTotais)}</TableCell>
                    <TableCell className="text-right">{fmtBrl(row.custoHora.fixo)}</TableCell>
                    <TableCell className="text-right">{fmtBrl(row.custoHora.combustivel)}</TableCell>
                    <TableCell className="text-right">{fmtBrl(row.custoHora.manutencao)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {fmtBrl(row.custoHora.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {rowsSorted.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                      role="status"
                    >
                      Nenhum dado no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Comparativo terceirização ───────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Comparativo com Terceirização</CardTitle>
          <CardDescription>Compare o custo próprio com o preço de mercado R$/h</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="comp-maquina">Máquina</Label>
              <select
                id="comp-maquina"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={maquinaComparativo}
                onChange={(e) => setMaquinaComparativo(e.target.value)}
              >
                <option value="">Selecione…</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-preco">Preço de mercado (R$/h)</Label>
              <Input
                id="comp-preco"
                type="number"
                min={0}
                step={0.01}
                placeholder="Ex: 350.00"
                value={precoMercado}
                onChange={(e) => setPrecoMercado(e.target.value)}
                className="w-44"
              />
            </div>
          </div>

          {rowComparativo && precoMercadoNum > 0 && diferencaComparativo !== null && (
            <div className="mt-4 p-4 rounded-xl border bg-muted/30 space-y-1">
              <p className="text-sm font-medium">{rowComparativo.maquina.nome}</p>
              <div className="flex gap-6 text-sm">
                <span>Custo próprio: <strong>{fmtBrl(rowComparativo.custoHora.total)}/h</strong></span>
                <span>Mercado: <strong>{fmtBrl(precoMercadoNum)}/h</strong></span>
                <span className={diferencaComparativo >= 0 ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                  {diferencaComparativo >= 0
                    ? `✓ Próprio é ${fmtBrl(diferencaComparativo)}/h mais barato`
                    : `✗ Próprio é ${fmtBrl(Math.abs(diferencaComparativo))}/h mais caro`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
