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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type MovimentacaoSilo } from '@/lib/supabase';
import { ArrowDownRight, ArrowUpRight, RotateCw, Plus, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EstoqueTabProps {
  siloId: string;
  volumeTotal: number;
  movimentacoes: MovimentacaoSilo[];
  estoque: number;
  consumoDiario: number | null;
  estoquePara: number | null;
  onNovaMovimentacao: () => void;
  onRefresh: () => void;
}

export function EstoqueTab({
  siloId,
  volumeTotal,
  movimentacoes,
  estoque,
  consumoDiario,
  estoquePara,
  onNovaMovimentacao,
  onRefresh,
}: EstoqueTabProps) {
  const entradas = movimentacoes
    .filter((m) => m.tipo === 'Entrada')
    .reduce((acc, m) => acc + m.quantidade, 0);

  const saidas = movimentacoes
    .filter((m) => m.tipo === 'Saída')
    .reduce((acc, m) => acc + m.quantidade, 0);

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
      {/* Resumo de Estoque */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl bg-card shadow-sm">
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

        <Card className="rounded-2xl bg-card shadow-sm">
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

        <Card className="rounded-2xl bg-card shadow-sm">
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

        <Card className="rounded-2xl bg-card shadow-sm">
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
                  <p className="text-xs text-muted-foreground mt-1">{consumoDiario} t/dia</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <Badge variant="outline">{quantidade.toFixed(1)} t</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={onRefresh}>
          <RotateCw className="h-4 w-4" />
          Atualizar
        </Button>
        <Button onClick={onNovaMovimentacao} className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Movimentação
        </Button>
      </div>

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
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Entrada
                              </Badge>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
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
