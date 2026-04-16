'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoriaCalculo } from '@/lib/types/planejamento-silagem';
import { formatTon, formatPercent } from '@/lib/utils/format-planejamento';

interface TabelaDetalhamentoProps {
  categorias: CategoriaCalculo[];
}

export function TabelaDetalhamento({ categorias }: TabelaDetalhamentoProps) {
  const categoriasComQuantidade = categorias.filter((cat) => cat.quantidade_cabecas > 0);
  const totalDemanda = categoriasComQuantidade.reduce(
    (sum, cat) => sum + cat.demanda_ms_ton,
    0
  );

  if (categoriasComQuantidade.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Nenhuma categoria com quantidade definida
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Detalhamento por Categoria</CardTitle>
        <CardDescription>Demanda de MS por categoria do rebanho</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">n</TableHead>
                <TableHead className="text-right">Demanda MS (ton)</TableHead>
                <TableHead className="text-right">Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriasComQuantidade.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{cat.nome}</p>
                      <p className="text-xs text-muted-foreground">{cat.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {cat.quantidade_cabecas}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatTon(cat.demanda_ms_ton)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(cat.participacao_pct)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Linha de totais */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">{formatTon(totalDemanda)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
