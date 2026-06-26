'use client';

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
import { Badge } from '@/components/ui/badge';
import { type MovimentacaoSilo } from '@/lib/supabase';
import { ArrowDownRight, ArrowUpRight, TrendingDown, Gauge, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EstoqueCardsProps {
  movimentacoes: MovimentacaoSilo[];
  estoque: number;
  /** Consumo médio diário (t/dia), excluindo venda e transferência. null se não houve consumo. */
  consumoDiario: number | null;
  estoquePara: number | null;
  /** % de perdas (descartes ÷ total de saídas). null se não houve saída. */
  taxaPerdas: number | null;
}

/**
 * Os cards de resumo de estoque, em grid 2×n (para ocupar a coluna direita).
 */
export function EstoqueCards({
  movimentacoes,
  estoque,
  consumoDiario,
  estoquePara,
  taxaPerdas,
}: EstoqueCardsProps) {
  const entradas = movimentacoes
    .filter((m) => m.tipo === 'Entrada')
    .reduce((acc, m) => acc + m.quantidade, 0);

  const saidas = movimentacoes
    .filter((m) => m.tipo === 'Saída')
    .reduce((acc, m) => acc + m.quantidade, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <Card className="rounded-2xl bg-card shadow-sm border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Entradas Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{entradas.toFixed(1)} t</p>
            <ArrowDownRight className="h-5 w-5 text-green-600" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card shadow-sm border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saídas Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{saidas.toFixed(1)} t</p>
            <ArrowUpRight className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card shadow-sm border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Estoque Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{estoque.toFixed(1)} t</p>
            <TrendingDown className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card shadow-sm border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Dias Restantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">
                {estoquePara !== null ? estoquePara : '-'}
              </p>
              {consumoDiario !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {consumoDiario.toFixed(2)} t/dia
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card shadow-sm border-l-4 border-l-cyan-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Consumo Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">
                {consumoDiario !== null ? `${consumoDiario.toFixed(2)} t/dia` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {consumoDiario !== null
                  ? 'exclui venda e transferência'
                  : 'sem consumo registrado'}
              </p>
            </div>
            <Gauge className="h-5 w-5 text-cyan-600" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card shadow-sm border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Perdas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">
                {taxaPerdas !== null ? `${taxaPerdas.toFixed(1)}%` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                descartes ÷ saídas
              </p>
            </div>
            <Percent className="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface HistoricoMovimentacoesProps {
  movimentacoes: MovimentacaoSilo[];
  estoque: number;
}

/**
 * Distribuição de saídas por subtipo + tabela de histórico de movimentações.
 * Ocupa largura total, abaixo de todo o resto da página.
 */
export function HistoricoMovimentacoes({
  movimentacoes,
  estoque,
}: HistoricoMovimentacoesProps) {
  // Agrupar saídas por subtipo (não por observação)
  const saidasPorSubtipo: Record<string, number> = {};
  movimentacoes
    .filter((m) => m.tipo === 'Saída')
    .forEach((m) => {
      const key = m.subtipo || 'Sem subtipo';
      saidasPorSubtipo[key] = (saidasPorSubtipo[key] || 0) + m.quantidade;
    });

  return (
    <div className="space-y-6">
      {/* Distribuição de Saídas por Subtipo */}
      {Object.keys(saidasPorSubtipo).length > 0 && (
        <Card className="rounded-2xl bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Distribuição de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(saidasPorSubtipo).map(([subtipo, quantidade]) => (
                <div key={subtipo} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{subtipo}</span>
                  <Badge variant="outline" className="text-sm">{quantidade.toFixed(1)} t</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Histórico */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            {movimentacoes.length > 0
              ? `${movimentacoes.length} registro(s) — ${estoque.toFixed(2)} t em estoque`
              : 'Nenhuma movimentação registrada. Clique em "Registrar Movimentação" para começar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table aria-label="Histórico de movimentações de estoque">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Data</TableHead>
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Subtipo</TableHead>
                  <TableHead scope="col">Quantidade</TableHead>
                  <TableHead scope="col">Responsável</TableHead>
                  <TableHead scope="col">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.length > 0 ? (
                  movimentacoes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm">
                        {format(new Date(mov.data + 'T00:00:00'), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {mov.tipo === 'Entrada' ? (
                            <>
                              <ArrowDownRight className="h-4 w-4 text-green-500" aria-hidden="true" />
                              <Badge variant="secondary" className="text-sm bg-green-100 text-green-700">
                                Entrada
                              </Badge>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
                              <Badge variant="secondary" className="text-sm bg-amber-100 text-amber-700">
                                Saída
                              </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mov.subtipo || '-'}
                      </TableCell>
                      <TableCell className="font-bold">{mov.quantidade.toFixed(2)} t</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mov.responsavel || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {mov.observacao || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhuma movimentação registrada ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
