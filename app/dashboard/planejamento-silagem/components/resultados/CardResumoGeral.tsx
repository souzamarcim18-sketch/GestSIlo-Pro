'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatTon,
  formatHa,
  formatKgDia,
} from '@/lib/utils/format-planejamento';
import { ResultadosPlanejamento } from '@/lib/types/planejamento-silagem';

interface CardResumoGeralProps {
  resultados: ResultadosPlanejamento;
}

export function CardResumoGeral({ resultados }: CardResumoGeralProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Demanda MS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Demanda MS Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatTon(resultados.demanda_ms_total_ton)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">ton</p>
        </CardContent>
      </Card>

      {/* Demanda MO com perdas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Demanda MO (com perdas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatTon(resultados.demanda_mo_com_perdas_ton)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">ton</p>
        </CardContent>
      </Card>

      {/* Consumo diário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Consumo Diário MO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatKgDia(resultados.consumo_diario_mo_kg)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">kg/dia</p>
        </CardContent>
      </Card>

      {/* Área de plantio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Área de Plantio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatHa(resultados.area_plantio_ha)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">ha</p>
        </CardContent>
      </Card>
    </div>
  );
}
