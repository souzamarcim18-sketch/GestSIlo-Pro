'use client';

import { useState } from 'react';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusCompraBadge from './StatusCompraBadge';
import MarcarComoCompradoModal from './MarcarComoCompradoModal';
import { formatBRL } from '@/lib/utils';
import type { LinhaRelatorioCompras } from '@/lib/types/planejamento-compras';

interface RelatorioComprasProps {
  linhas: LinhaRelatorioCompras[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function RelatorioCompras({ linhas, isAdmin, onRefresh }: RelatorioComprasProps) {
  const [linhaSelecionada, setLinhaSelecionada] = useState<LinhaRelatorioCompras | null>(null);

  const temPrecoFaltante = linhas.some((l) => l.preco_unitario === null);

  const totalEstimado = linhas.reduce<number>(
    (acc, l) => (l.valor_estimado != null ? acc + l.valor_estimado : acc),
    0
  );

  const temLinhasComPreco = linhas.some((l) => l.valor_estimado != null);

  if (linhas.length === 0) {
    return (
      <div className="rounded-md border border-border/40 p-8 text-center text-muted-foreground text-sm">
        Nenhum insumo encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Banner preços faltantes */}
      {temPrecoFaltante && (
        <div className="flex items-start gap-2.5 rounded-md border border-[rgba(245,208,0,0.3)] bg-[rgba(245,208,0,0.07)] px-4 py-3 text-sm text-[#f5d000]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Alguns insumos não possuem preço unitário cadastrado. Para visualizar o valor estimado
            total, preencha os preços no módulo{' '}
            <strong>Insumos</strong>.
          </span>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-md border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Insumo</TableHead>
              <TableHead className="text-xs text-center">Unidade</TableHead>
              <TableHead className="text-xs text-right">Total Planejado</TableHead>
              <TableHead className="text-xs text-right">Estoque Atual</TableHead>
              <TableHead className="text-xs text-right">Qtd. a Comprar</TableHead>
              <TableHead className="text-xs text-right">Preço Unit.</TableHead>
              <TableHead className="text-xs text-right">Valor Est.</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              {isAdmin && <TableHead className="text-xs text-center w-10" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={linha.insumo_id} className="text-sm">
                <TableCell className="font-medium text-sm">{linha.insumo_nome}</TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {linha.unidade}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {linha.total_planejado.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {linha.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums font-medium">
                  {linha.quantidade_a_comprar.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {linha.preco_unitario != null
                    ? formatBRL(linha.preco_unitario)
                    : <span className="text-xs text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {linha.valor_estimado != null
                    ? formatBRL(linha.valor_estimado)
                    : <span className="text-xs text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  <StatusCompraBadge status={linha.status_compra} />
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Registrar compra"
                      onClick={() => setLinhaSelecionada(linha)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>

          {temLinhasComPreco && (
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="text-sm font-medium text-right text-muted-foreground"
                >
                  Total estimado
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {formatBRL(totalEstimado)}
                </TableCell>
                <TableCell colSpan={isAdmin ? 2 : 1} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Modal marcar como comprado */}
      <MarcarComoCompradoModal
        linha={linhaSelecionada}
        onClose={() => setLinhaSelecionada(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
