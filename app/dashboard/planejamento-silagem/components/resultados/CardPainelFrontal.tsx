'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatM2,
} from '@/lib/utils/format-planejamento';
import {
  gerarExemplosDimensaoPainel,
  calcularPainelMultiplosSilos,
} from '@/lib/services/planejamento-silagem';
import { ResultadosPlanejamento, ParametrosPlanejamento } from '@/lib/types/planejamento-silagem';

interface CardPainelFrontalProps {
  resultados: ResultadosPlanejamento;
  parametros: ParametrosPlanejamento;
}

export function CardPainelFrontal({ resultados, parametros }: CardPainelFrontalProps) {
  // Gerar exemplos de dimensão
  const exemplosDimensao = gerarExemplosDimensaoPainel(resultados.area_painel_m2);
  const exemploMultiplosSilos =
    resultados.area_painel_m2 > 15
      ? calcularPainelMultiplosSilos(resultados.area_painel_m2, 2)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Painel Frontal do Silo</CardTitle>
        <CardDescription>
          Dimensionamento da área frontal baseado em taxa de retirada de{' '}
          {parametros.taxa_retirada_kg_m2_dia} kg/m²/dia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Área máxima do painel: {formatM2(resultados.area_painel_m2)} m²
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Exemplos de dimensão:</p>
          <ul className="space-y-1">
            {exemplosDimensao.map((ex, idx) => (
              <li key={idx} className="text-sm text-muted-foreground">
                • {ex.largura.toFixed(1)} m larg. × {ex.altura.toFixed(1)} m alt. ={' '}
                {formatM2(ex.area)}
              </li>
            ))}
          </ul>
        </div>

        {exemploMultiplosSilos && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
              Se usar 2 silos simultâneos:
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              • cada painel ≤ {formatM2(exemploMultiplosSilos.area_por_silo)} m² (ex.:{' '}
              {exemploMultiplosSilos.exemplo.largura.toFixed(1)} m ×{' '}
              {exemploMultiplosSilos.exemplo.altura.toFixed(1)} m)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
