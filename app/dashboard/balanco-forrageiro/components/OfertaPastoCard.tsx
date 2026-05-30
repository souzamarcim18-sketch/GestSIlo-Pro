'use client';

import { Leaf, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ResultadoOfertaPasto, ResultadoDemandaLiquidaSilos } from '@/lib/utils/balanco-forrageiro';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';

const TOOLTIP_STYLE = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '12px',
} as const;

function badgeEpoca(epoca: 'verao' | 'seca') {
  return epoca === 'verao'
    ? <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">☀️ Verão / Chuvas</Badge>
    : <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs">🍂 Seca / Inverno</Badge>;
}

interface Props {
  oferta: ResultadoOfertaPasto;
  demandaLiquida: ResultadoDemandaLiquidaSilos;
}

export function OfertaPastoCard({ oferta, demandaLiquida }: Props) {
  const autonomiaClasses = classesAutonomia(demandaLiquida.autonomia_liquida_dias);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Leaf className="h-4 w-4 text-green-500" aria-hidden="true" />
            Oferta de Pasto
          </CardTitle>
          {badgeEpoca(oferta.epoca)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Contribuição diária estimada dos piquetes em pastejo
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Aviso de espécie não cadastrada */}
        {oferta.piquetes_sem_especie > 0 && (
          <Alert className="border-yellow-600/30 bg-yellow-600/5 py-2">
            <Info className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
            <AlertDescription className="text-xs text-yellow-400">
              {oferta.piquetes_sem_especie === 1
                ? '1 piquete usa estimativa padrão (espécie não cadastrada).'
                : `${oferta.piquetes_sem_especie} piquetes usam estimativa padrão.`}{' '}
              Cadastrar a espécie forrageira na pastagem melhora a precisão do cálculo.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de cobertura baixa */}
        {oferta.alerta_cobertura_baixa && !oferta.sem_piquetes && (
          <Alert className="border-destructive/30 bg-destructive/5 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <AlertDescription className="text-xs text-destructive">
              Oferta de pasto cobre menos de 20% da demanda do rebanho. Os silos precisarão
              suprir a maior parte da alimentação.
            </AlertDescription>
          </Alert>
        )}

        {/* Sem piquetes ativos */}
        {oferta.sem_piquetes ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum piquete em pastejo no momento.
          </p>
        ) : (
          <>
            {/* KPIs resumo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-md p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Oferta Total / Dia
                </p>
                <p className="text-2xl font-bold text-green-400">
                  {oferta.oferta_total_kg_ms_dia.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">kg MS/dia</p>
              </div>

              <div className="bg-surface rounded-md p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Autonomia Silos (líquida)
                </p>
                {demandaLiquida.pasto_cobre_tudo ? (
                  <p className="text-sm font-semibold text-green-400 mt-1">
                    Pasto cobre 100%
                  </p>
                ) : demandaLiquida.autonomia_liquida_dias !== null ? (
                  <>
                    <p className={`text-2xl font-bold ${autonomiaClasses.text}`}>
                      {demandaLiquida.autonomia_liquida_dias}
                    </p>
                    <p className="text-xs text-muted-foreground">dias (descontando pasto)</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">—</p>
                )}
              </div>
            </div>

            {/* Tabela por piquete */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Por Piquete
              </p>
              <div className="space-y-1">
                {oferta.por_piquete.map((p) => (
                  <div
                    key={p.piquete_id}
                    className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-surface text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.piquete_nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.pastagem_nome}
                        {' · '}
                        {p.especie_forrageira ?? (
                          <span className="italic text-yellow-500/80">estimativa</span>
                        )}
                        {' · '}
                        {p.area_ha} ha
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-green-400">
                        {p.oferta_kg_ms_dia.toFixed(0)} kg
                      </p>
                      <p className="text-xs text-muted-foreground">MS/dia</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota de metodologia */}
            <p className="text-xs text-muted-foreground">
              * Oferta calculada como: taxa MS/ha/dia da espécie na época × área do piquete.
              Valores baseados em dados Embrapa para {oferta.epoca === 'verao' ? 'período das chuvas' : 'período seco'}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Exporta o estilo para uso em tooltip Recharts se necessário no futuro
export { TOOLTIP_STYLE as OFERTA_PASTO_TOOLTIP_STYLE };
