'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MovimentacaoComNome } from '@/types/insumos';

interface UltimasMovimentacoesProps {
  entradas?: MovimentacaoComNome[];
  saidas?: MovimentacaoComNome[];
}

const MAX_ITEMS = 4;

export default function UltimasMovimentacoes({ entradas = [], saidas = [] }: UltimasMovimentacoesProps) {
  // Ordena e limita a 4 itens cada
  const ultimasEntradas = (entradas || [])
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, MAX_ITEMS);

  const ultimasSaidas = (saidas || [])
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, MAX_ITEMS);

  if (ultimasEntradas.length === 0 && ultimasSaidas.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Entradas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle className="text-base">Últimas Entradas</CardTitle>
              <CardDescription className="text-xs">Insumos recebidos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ultimasEntradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma entrada registrada</p>
          ) : (
            <div className="space-y-3">
              {ultimasEntradas.map((mov) => (
                <div key={mov.id} className="flex justify-between items-start p-2 rounded border border-green-200/50 bg-green-50/30 dark:bg-green-950/20 dark:border-green-900/30">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{mov.insumo_nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {mov.quantidade} {mov.insumo_unidade}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {format(new Date(mov.data + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saídas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-red-600" />
            <div>
              <CardTitle className="text-base">Últimas Saídas</CardTitle>
              <CardDescription className="text-xs">Insumos utilizados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ultimasSaidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma saída registrada</p>
          ) : (
            <div className="space-y-3">
              {ultimasSaidas.map((mov) => (
                <div key={mov.id} className="flex justify-between items-start p-2 rounded border border-red-200/50 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/30">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{mov.insumo_nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {mov.quantidade} {mov.insumo_unidade}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {format(new Date(mov.data + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
