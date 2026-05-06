'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ComparativoLotesProps } from '@/types/rebanho-indicadores';

const CORES_INDICADOR = {
  gmd: '#3b82f6',
  natalidade: '#10b981',
  prenhez: '#8b5cf6',
  peso: '#f59e0b',
};

const CHAVES_INDICADOR = {
  gmd: 'gmd',
  natalidade: 'taxaNatalidade',
  prenhez: 'taxaPrenhez',
  peso: 'pesoMedio',
};

const UNIDADES = {
  gmd: 'kg/dia',
  natalidade: '%',
  prenhez: '%',
  peso: 'kg',
};

export function ComparativoLotes(props: ComparativoLotesProps) {
  const { dados, indicador, onSelectLote } = props;

  const chaveIndicador = CHAVES_INDICADOR[indicador];
  const unidade = UNIDADES[indicador];
  const cor = CORES_INDICADOR[indicador];

  const dadosGrafico = dados.map((lote) => ({
    loteNome: lote.loteNome,
    valor: lote[chaveIndicador as keyof typeof lote] ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Tabela */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12 text-center">Rank</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead className="text-right">Animais</TableHead>
              <TableHead className="text-right">{unidade}</TableHead>
              <TableHead className="text-center">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((lote, idx) => (
              <TableRow
                key={lote.loteId}
                onClick={() => onSelectLote?.(lote.loteId)}
                className="cursor-pointer hover:bg-blue-50"
              >
                <TableCell className="text-center font-semibold text-gray-600">
                  #{idx + 1}
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  {lote.loteNome}
                </TableCell>
                <TableCell className="text-right text-gray-600">
                  {lote.quantidadeAnimais}
                </TableCell>
                <TableCell className="text-right font-semibold text-gray-900">
                  {Number(lote[chaveIndicador as keyof typeof lote] ?? 0).toFixed(2)} {unidade}
                </TableCell>
                <TableCell className="text-center">
                  {lote.trend === 'up' && (
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        +{lote.trendValor?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {lote.trend === 'down' && (
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {lote.trendValor?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {lote.trend === 'stable' && (
                    <span className="text-xs text-gray-500">→</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Gráfico */}
      <div className="w-full overflow-x-auto">
        <BarChart
          data={dadosGrafico}
          width={Math.max(600, dados.length * 100)}
          height={300}
          margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="loteNome"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: `${unidade}`, angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => `${Number(value).toFixed(2)} ${unidade}`}
            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
          />
          <Legend />
          <Bar
            dataKey="valor"
            fill={cor}
            name={`${indicador.charAt(0).toUpperCase()}${indicador.slice(1)} (${unidade})`}
            isAnimationActive={false}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </div>
    </div>
  );
}
