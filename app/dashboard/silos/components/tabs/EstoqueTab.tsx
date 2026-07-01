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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type MovimentacaoSilo } from '@/lib/supabase';
import { ArrowDownRight, ArrowUpRight, TrendingDown, Gauge, Percent, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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
  /** Quando true, exibe a coluna de ações (Editar/Excluir). */
  isAdmin?: boolean;
  onEdit?: (mov: MovimentacaoSilo) => void;
  onDelete?: (mov: MovimentacaoSilo) => void;
}

/**
 * Distribuição de saídas por subtipo + tabela de histórico de movimentações.
 * Ocupa largura total, abaixo de todo o resto da página.
 */
export function HistoricoMovimentacoes({
  movimentacoes,
  estoque,
  isAdmin = false,
  onEdit,
  onDelete,
}: HistoricoMovimentacoesProps) {
  const mostrarAcoes = isAdmin && (!!onEdit || !!onDelete);
  const colCount = mostrarAcoes ? 7 : 6;
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
                  {mostrarAcoes && (
                    <TableHead scope="col" className="text-right">Ações</TableHead>
                  )}
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
                              <ArrowDownRight className="h-4 w-4 text-primary" aria-hidden="true" />
                              <Badge variant="outline" className="text-sm bg-primary/15 text-primary border-primary/30">
                                Entrada
                              </Badge>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-4 w-4 text-[color:var(--status-warning)]" aria-hidden="true" />
                              <Badge variant="outline" className="text-sm bg-[color:var(--status-warning)]/15 text-[color:var(--status-warning)] border-[color:var(--status-warning)]/30">
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
                      {mostrarAcoes && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              aria-label="Ações da movimentação"
                            >
                              <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(mov)}>
                                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem
                                  onClick={() => onDelete(mov)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={colCount}
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
