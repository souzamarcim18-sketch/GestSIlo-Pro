'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Leaf, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';
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

/**
 * Card-veredito do Balanço Forrageiro: a resposta da página em uma frase.
 * Responde à pergunta do produtor — "por quantos dias meu rebanho está alimentado?".
 */
export function VeredictoCard({ demanda, ofertaPasto, demandaLiquida }: Props) {
  const semRebanho = demanda.por_categoria.length === 0;

  // Caso 1 — sem rebanho ativo: não há o que projetar.
  if (semRebanho) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <Leaf className="h-8 w-8 text-muted-foreground shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-bold text-foreground">Sem rebanho ativo cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Cadastre animais ativos para projetar a autonomia de pasto e silagem.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Caso 2 — o pasto cobre 100% da demanda: silos viram reserva.
  if (demandaLiquida.pasto_cobre_tudo) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-5 flex items-start gap-4">
          <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-green-400 leading-tight">
              O pasto cobre toda a demanda do rebanho
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              A oferta das pastagens supre 100% do consumo. Seus silos ficam como{' '}
              <span className="text-foreground font-medium">reserva estratégica</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Caso 3 — pasto não cobre tudo: o silo cobre o restante por X dias.
  const dias = demandaLiquida.autonomia_liquida_dias;
  const cls = classesAutonomia(dias);
  const critico = cls.label === 'critico';
  const atencao = cls.label === 'urgente';

  return (
    <Card className={`border-l-4 ${critico ? 'border-l-red-500' : atencao ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
      <CardContent className="p-5 flex items-start gap-4">
        {critico || atencao ? (
          <AlertTriangle className={`h-8 w-8 shrink-0 ${cls.text}`} aria-hidden="true" />
        ) : (
          <Leaf className={`h-8 w-8 shrink-0 ${cls.text}`} aria-hidden="true" />
        )}
        <div className="min-w-0">
          {dias !== null ? (
            <p className="text-lg font-semibold text-foreground leading-snug">
              Somando pasto e silo, seu rebanho está alimentado por mais{' '}
              <span className={`text-3xl font-extrabold align-baseline ${cls.text}`}>{dias}</span>{' '}
              <span className={`text-xl font-bold ${cls.text}`}>{dias === 1 ? 'dia' : 'dias'}</span>.
            </p>
          ) : (
            <p className="text-lg font-semibold text-foreground">
              Autonomia indisponível — sem estoque de silagem registrado.
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {critico
              ? 'Estoque crítico. Planeje reposição ou ajuste o manejo do pasto com urgência.'
              : atencao
                ? 'Estoque em atenção. Comece a planejar a próxima silagem.'
                : 'O pasto cobre parte da demanda; o silo supre o restante com folga.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
