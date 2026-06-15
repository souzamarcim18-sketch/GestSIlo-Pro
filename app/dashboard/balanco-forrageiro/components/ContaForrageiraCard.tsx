'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Minus, Equal } from 'lucide-react';
import type {
  ResultadoDemandaProjetada,
  ResultadoOfertaPasto,
  ResultadoDemandaLiquidaSilos,
} from '@/lib/utils/balanco-forrageiro';

interface Props {
  demanda: ResultadoDemandaProjetada;
  ofertaPasto: ResultadoOfertaPasto;
  demandaLiquida: ResultadoDemandaLiquidaSilos;
}

function Termo({
  rotulo,
  valor,
  sufixo,
  cor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  sufixo: string;
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center px-2 ${destaque ? 'flex-1' : ''}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{rotulo}</p>
      <p className={`font-bold ${destaque ? 'text-3xl' : 'text-2xl'} ${cor}`}>{valor}</p>
      <p className="text-xs text-muted-foreground">{sufixo}</p>
    </div>
  );
}

/**
 * A "conta" do balanço, em uma linha:
 *   Demanda do rebanho  −  Oferta do pasto  =  o que o silo precisa cobrir.
 * Torna explícito que tudo na página deriva de uma única subtração.
 */
export function ContaForrageiraCard({ demanda, ofertaPasto, demandaLiquida }: Props) {
  if (demanda.por_categoria.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
          A conta da alimentação (por dia)
        </p>

        <div className="flex items-stretch justify-between gap-1">
          <Termo
            rotulo="Demanda do rebanho"
            valor={demanda.demanda_total_kg_ms_dia.toFixed(0)}
            sufixo="kg MS/dia"
            cor="text-foreground"
          />

          <div className="flex items-center text-muted-foreground" aria-label="menos">
            <Minus className="h-5 w-5" />
          </div>

          <Termo
            rotulo="Oferta do pasto"
            valor={ofertaPasto.oferta_total_kg_ms_dia.toFixed(0)}
            sufixo="kg MS/dia"
            cor="text-green-400"
          />

          <div className="flex items-center text-muted-foreground" aria-label="igual a">
            <Equal className="h-5 w-5" />
          </div>

          {demandaLiquida.pasto_cobre_tudo ? (
            <Termo
              rotulo="Silo precisa cobrir"
              valor="0"
              sufixo="pasto é suficiente"
              cor="text-green-400"
              destaque
            />
          ) : (
            <Termo
              rotulo="Silo precisa cobrir"
              valor={demandaLiquida.demanda_liquida_kg_ms_dia.toFixed(0)}
              sufixo="kg MS/dia"
              cor="text-foreground"
              destaque
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
