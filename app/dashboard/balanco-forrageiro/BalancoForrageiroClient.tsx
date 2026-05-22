'use client';

import { useState, useMemo } from 'react';
import {
  calcularConsumoHistorico,
  calcularComparativo,
} from '@/lib/utils/balanco-forrageiro';
import type {
  BalancoForrageiroClientProps,
  PeriodoBalanco,
  ResultadoConsumoReal,
} from '@/lib/utils/balanco-forrageiro';
import { PeriodoSelector } from './components/PeriodoSelector';
import { KpisSection } from './components/KpisSection';
import { ConsumoHistoricoCard } from './components/ConsumoHistoricoCard';
import { DemandaProjetadaCard } from './components/DemandaProjetadaCard';
import { ComparativoSection } from './components/ComparativoSection';

export function BalancoForrageiroClient({
  estoqueTotal_kg,
  initialConsumo,
  initialDemanda,
  saidasUltimos90Dias,
  animaisPorCategoria: _animaisPorCategoria,
}: BalancoForrageiroClientProps) {
  const [periodo, setPeriodo] = useState<PeriodoBalanco>(30);
  const [consumo, setConsumo] = useState<ResultadoConsumoReal>(initialConsumo);

  const demanda = initialDemanda;

  function handlePeriodoChange(novoPeriodo: PeriodoBalanco) {
    setPeriodo(novoPeriodo);
    setConsumo(calcularConsumoHistorico(saidasUltimos90Dias, novoPeriodo, estoqueTotal_kg));
  }

  const comparativo = useMemo(
    () => calcularComparativo(consumo, demanda),
    [consumo, demanda]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balanço Forrageiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confronte estoque e demanda do rebanho
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          Período de análise do consumo histórico:
        </p>
        <PeriodoSelector value={periodo} onChange={handlePeriodoChange} />
      </div>

      <KpisSection
        estoqueTotal_kg={estoqueTotal_kg}
        consumo={consumo}
        demanda={demanda}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConsumoHistoricoCard consumo={consumo} />
        <DemandaProjetadaCard demanda={demanda} estoqueTotal_kg={estoqueTotal_kg} />
      </div>

      <ComparativoSection comparativo={comparativo} consumo={consumo} demanda={demanda} />
    </div>
  );
}
