'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MovimentacaoComNome } from '@/types/insumos';

interface UltimasMovimentacoesProps {
  entradas?: MovimentacaoComNome[];
  saidas?: MovimentacaoComNome[];
}

export default function UltimasMovimentacoes({ entradas = [], saidas = [] }: UltimasMovimentacoesProps) {
  // Combina e ordena as últimas 8 movimentações
  const todas = [...(entradas || []), ...(saidas || [])]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  if (todas.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Movimentações</CardTitle>
        <CardDescription>Entradas e saídas mais recentes</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Data</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todas.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(new Date(mov.data + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                </TableCell>
                <TableCell className="font-medium text-sm">{mov.insumo_nome}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {mov.tipo === 'Entrada' ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {mov.tipo === 'Entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {mov.quantidade} {mov.insumo_unidade}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
