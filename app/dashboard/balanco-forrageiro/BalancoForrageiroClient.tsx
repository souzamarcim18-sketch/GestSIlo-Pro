'use client';

import { useState, useMemo } from 'react';
import {
  calcularConsumoHistorico,
  calcularComparativo,
  calcularOfertaPasto,
  calcularDemandaLiquidaSilos,
  classesAutonomia,
} from '@/lib/utils/balanco-forrageiro';
import type {
  BalancoForrageiroClientProps,
  PeriodoBalanco,
  ResultadoConsumoReal,
} from '@/lib/utils/balanco-forrageiro';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PeriodoSelector } from './components/PeriodoSelector';
import { VeredictoCard } from './components/VeredictoCard';
import { ContaForrageiraCard } from './components/ContaForrageiraCard';
import { ConsumoHistoricoCard } from './components/ConsumoHistoricoCard';
import { DemandaProjetadaCard } from './components/DemandaProjetadaCard';
import { OfertaPastoCard } from './components/OfertaPastoCard';
import { ComparativoSection } from './components/ComparativoSection';

export function BalancoForrageiroClient({
  estoqueTotal_kg,
  initialConsumo,
  initialDemanda,
  initialOfertaPasto: _initialOfertaPasto,
  initialDemandaLiquida: _initialDemandaLiquida,
  saidasUltimos90Dias,
  animaisPorCategoria: _animaisPorCategoria,
  piquetesAtivos,
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

  const ofertaPasto = useMemo(
    () => calcularOfertaPasto(piquetesAtivos, demanda.demanda_total_kg_ms_dia),
    [piquetesAtivos, demanda.demanda_total_kg_ms_dia]
  );

  const demandaLiquida = useMemo(
    () =>
      calcularDemandaLiquidaSilos(
        demanda.demanda_total_kg_ms_dia,
        ofertaPasto.oferta_total_kg_ms_dia,
        estoqueTotal_kg
      ),
    [demanda.demanda_total_kg_ms_dia, ofertaPasto.oferta_total_kg_ms_dia, estoqueTotal_kg]
  );

  const estoqueTon = (estoqueTotal_kg / 1000).toFixed(1);
  const autonomiaRealCls = classesAutonomia(consumo.autonomia_real_dias);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold">Balanço Forrageiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quanto tempo seu rebanho está alimentado, somando pasto e silo
        </p>
      </div>

      {/* 1. Veredito — a resposta da página */}
      <VeredictoCard
        demanda={demanda}
        ofertaPasto={ofertaPasto}
        demandaLiquida={demandaLiquida}
      />

      {/* 2. A conta — demanda − pasto = silo */}
      <ContaForrageiraCard
        demanda={demanda}
        ofertaPasto={ofertaPasto}
        demandaLiquida={demandaLiquida}
      />

      {/* 3. Contexto enxuto: estoque, autonomia pelo consumo real, época */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Estoque de Silagem
            </p>
            <p className="text-3xl font-bold">{estoqueTon}</p>
            <p className="text-sm text-muted-foreground">toneladas (matéria verde)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Autonomia pelo consumo real
            </p>
            {consumo.autonomia_real_dias !== null ? (
              <p className={`text-3xl font-bold ${autonomiaRealCls.text}`}>
                {consumo.autonomia_real_dias}
                <span className="text-sm font-normal text-muted-foreground ml-1">dias</span>
              </p>
            ) : (
              <p className="text-3xl font-bold text-muted-foreground">—</p>
            )}
            <p className="text-sm text-muted-foreground">ritmo dos últimos {periodo} dias</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Época do ano
            </p>
            <p className="text-2xl font-bold">
              {ofertaPasto.epoca === 'verao' ? '☀️ Águas' : '🍂 Seca'}
            </p>
            <p className="text-sm text-muted-foreground">
              {ofertaPasto.por_piquete.length} piquete{ofertaPasto.por_piquete.length !== 1 ? 's' : ''} em pastejo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Detalhamento sob demanda */}
      <Card>
        <CardContent className="px-4 py-1">
          <Accordion>
            <AccordionItem value="oferta">
              <AccordionTrigger>De onde vem a oferta do pasto</AccordionTrigger>
              <AccordionContent>
                <OfertaPastoCard oferta={ofertaPasto} demandaLiquida={demandaLiquida} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="demanda">
              <AccordionTrigger>Demanda do rebanho por categoria</AccordionTrigger>
              <AccordionContent>
                <DemandaProjetadaCard demanda={demanda} estoqueTotal_kg={estoqueTotal_kg} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="consumo">
              <AccordionTrigger>
                <span className="flex items-center gap-3">
                  Consumo histórico dos silos
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <p className="text-sm text-muted-foreground">Período de análise:</p>
                  <PeriodoSelector value={periodo} onChange={handlePeriodoChange} />
                </div>
                <ConsumoHistoricoCard consumo={consumo} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="comparativo">
              <AccordionTrigger>Comparativo consumo real × projetado</AccordionTrigger>
              <AccordionContent>
                <ComparativoSection
                  comparativo={comparativo}
                  consumo={consumo}
                  demanda={demanda}
                  ofertaPasto={ofertaPasto}
                  demandaLiquida={demandaLiquida}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
