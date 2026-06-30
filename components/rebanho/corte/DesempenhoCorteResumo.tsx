'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  calcularGMDUltimasDuas,
  calcularProjecaoAbate,
  calcularArrobasEstimadas,
} from '@/lib/calculos/indicadores-rebanho';
import type { Animal, PesoAnimal } from '@/lib/types/rebanho';

/**
 * Resumo de desempenho de corte de UM animal (GMD, condição corporal, arrobas,
 * projeção de abate). Componente compartilhável extraído da ficha do animal
 * (SPEC-rebanho012, P2.3). Reusa as MESMAS funções puras de cálculo — nenhum
 * cálculo reescrito.
 */
export function DesempenhoCorteResumo({ animal, pesos }: { animal: Animal; pesos: PesoAnimal[] }) {
  const gmdUltimas = calcularGMDUltimasDuas(pesos);
  const pesoAlvo = 480;
  const diasAbate = calcularProjecaoAbate(animal.peso_atual, gmdUltimas, pesoAlvo);
  const arrobas = calcularArrobasEstimadas(animal.peso_atual, 0.52);
  const currentTimeRef = useRef<number>(0);
  const [dataAbateEstimada, setDataAbateEstimada] = useState<string | null>(null);

  useEffect(() => {
    if (currentTimeRef.current === 0) {
      currentTimeRef.current = Date.now();
      if (diasAbate) {
        setDataAbateEstimada(
          new Date(currentTimeRef.current + diasAbate * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
        );
      } else {
        setDataAbateEstimada(null);
      }
    } else if (diasAbate) {
      setDataAbateEstimada(
        new Date(currentTimeRef.current + diasAbate * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      );
    } else {
      setDataAbateEstimada(null);
    }
  }, [diasAbate]);

  const getGmdColor = (gmd: number | null) => {
    if (gmd === null) return 'border-muted-foreground text-muted-foreground';
    if (gmd > 1) return 'border-green-600 text-green-600';
    if (gmd >= 0.5) return 'border-yellow-600 text-yellow-600';
    return 'border-red-600 text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">GMD (Últimas 2 Pesagens)</p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">
              {gmdUltimas ? `${gmdUltimas.toFixed(2)} kg/dia` : '—'}
            </div>
            {gmdUltimas !== null && (
              <Badge variant="outline" className={getGmdColor(gmdUltimas)}>
                {gmdUltimas > 1
                  ? 'Ótimo'
                  : gmdUltimas >= 0.5
                  ? 'Normal'
                  : 'Baixo'}
              </Badge>
            )}
          </div>
          {pesos.length < 2 && (
            <p className="text-xs text-muted-foreground mt-2">
              Registre 2 pesagens para calcular
            </p>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Condição Corporal</p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">
              {pesos.length > 0 && pesos[0].condicao_corporal
                ? `${pesos[0].condicao_corporal}/5`
                : '—'}
            </div>
            {pesos.length > 0 && pesos[0].condicao_corporal && (
              <div className="text-sm text-muted-foreground">
                {pesos[0].condicao_corporal === 1
                  ? 'Muito magra'
                  : pesos[0].condicao_corporal === 2
                  ? 'Magra'
                  : pesos[0].condicao_corporal === 3
                  ? 'Normal'
                  : pesos[0].condicao_corporal === 4
                  ? 'Gorda'
                  : 'Muito gorda'}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Arrobas Estimadas</p>
          <div className="text-2xl font-bold">
            {arrobas ? `${arrobas.toFixed(1)} @` : '—'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">(rendimento 52%)</p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Projeção de Abate</p>
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {diasAbate ? `${diasAbate} dias` : '—'}
            </div>
            {diasAbate && animal.peso_atual ? (
              <p className="text-xs text-muted-foreground">
                {dataAbateEstimada} (Peso-alvo: {pesoAlvo}kg)
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {animal.peso_atual && animal.peso_atual >= pesoAlvo
                  ? 'Pronto para abate'
                  : 'Sem dados suficientes'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
