'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/types/supabase';

type MovRow = Database['public']['Tables']['movimentacoes_produto']['Row'];

interface MovComNome extends MovRow {
  produto_nome?: string;
  produto_unidade?: string;
}

interface UltimasMovimentacoesProps {
  movimentacoes?: MovComNome[];
}

const tipoLabel: Record<string, string> = {
  COLHEITA: 'Colheita',
  COMPRA: 'Compra',
  AJUSTE_INICIAL: 'Estoque inicial',
  VENDA: 'Venda',
  CONSUMO_PROPRIO: 'Consumo próprio',
  PERDA: 'Perda',
  DOACAO: 'Doação',
  TRANSFERENCIA_INSUMO: 'Transf. Insumo',
  DESCARTE: 'Descarte',
};

export default function UltimasMovimentacoes({ movimentacoes = [] }: UltimasMovimentacoesProps) {
  if (!movimentacoes.length) return null;

  const sorted = [...movimentacoes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Últimas Movimentações</CardTitle>
        <CardDescription className="text-xs">10 movimentações mais recentes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map((mov) => {
            const isEntrada = mov.tipo === 'Entrada';
            const isSaida = mov.tipo === 'Saída';
            const subTipo = mov.tipo_entrada ?? mov.tipo_saida ?? '';
            return (
              <div
                key={mov.id}
                className="flex items-center gap-3 p-2 rounded border text-sm"
              >
                <div className="flex-shrink-0">
                  {isEntrada && <ArrowDownRight className="h-4 w-4 text-green-600" />}
                  {isSaida && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                  {!isEntrada && !isSaida && <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{mov.produto_nome ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {tipoLabel[subTipo] ?? mov.tipo}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    {isEntrada ? '+' : isSaida ? '-' : (mov.sinal_ajuste === 1 ? '+' : '-')}
                    {mov.quantidade} {mov.produto_unidade ?? ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(mov.data + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                  </div>
                </div>
                <Badge variant={isEntrada ? 'outline' : isSaida ? 'destructive' : 'secondary'} className="text-xs ml-1">
                  {mov.tipo}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
