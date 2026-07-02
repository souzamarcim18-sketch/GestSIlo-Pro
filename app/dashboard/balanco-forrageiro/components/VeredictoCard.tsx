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

  // Caso 3 — pasto não cobre tudo: o silo cobre o restante.
  // Duas leituras, ambas descontando o pasto:
  //   • REAL      = estoque ÷ (consumo de silagem medido − pasto) — o ritmo observado
  //   • PROJETADA = estoque ÷ (demanda teórica do rebanho − pasto) — a meta de planejamento
  const diasReal = demandaLiquida.autonomia_liquida_real_dias;
  const diasProjetado = demandaLiquida.autonomia_liquida_dias;
  const temReal = demandaLiquida.demanda_liquida_real_kg_dia !== null;

  // A tarja usa a leitura mais conservadora disponível (real quando existe, senão projetada).
  const diasReferencia = temReal ? diasReal : diasProjetado;
  const cls = classesAutonomia(diasReferencia);
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
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground leading-snug">
            Somando pasto e silo, seu rebanho está alimentado por:
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* REALIDADE — pelo consumo de silagem efetivamente medido */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Realidade (consumo medido)
              </p>
              {temReal && diasReal !== null ? (
                <p className={`font-bold ${classesAutonomia(diasReal).text}`}>
                  <span className="text-3xl align-baseline">{diasReal}</span>{' '}
                  <span className="text-base font-semibold">{diasReal === 1 ? 'dia' : 'dias'}</span>
                </p>
              ) : temReal ? (
                <p className="text-sm text-muted-foreground">
                  O pasto cobre todo o consumo medido — silos como reserva.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem histórico de consumo no período.
                </p>
              )}
            </div>

            {/* PROJEÇÃO — pela demanda teórica do rebanho */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Projeção (demanda teórica)
              </p>
              {diasProjetado !== null ? (
                <p className={`font-bold ${classesAutonomia(diasProjetado).text}`}>
                  <span className="text-3xl align-baseline">{diasProjetado}</span>{' '}
                  <span className="text-base font-semibold">{diasProjetado === 1 ? 'dia' : 'dias'}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Autonomia indisponível — sem estoque registrado.
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            A <span className="text-foreground font-medium">realidade</span> parte do consumo de silagem que você
            já registra nos silos; a <span className="text-foreground font-medium">projeção</span> parte da demanda
            teórica de todo o rebanho. Diferenças entre as duas são normais — nem todo o rebanho come silagem no dia a dia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
