import { Card, CardContent } from '@/components/ui/card';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';
import type {
  ResultadoConsumoReal,
  ResultadoDemandaProjetada,
  ResultadoOfertaPasto,
  ResultadoDemandaLiquidaSilos,
} from '@/lib/utils/balanco-forrageiro';
import { cn } from '@/lib/utils';

type KpisSectionProps = {
  estoqueTotal_kg: number;
  consumo: ResultadoConsumoReal;
  demanda: ResultadoDemandaProjetada;
  ofertaPasto: ResultadoOfertaPasto;
  demandaLiquida: ResultadoDemandaLiquidaSilos;
};

function AutonomiaBadge({ dias }: { dias: number | null }) {
  const cls = classesAutonomia(dias);
  if (dias === null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold', cls.bg, cls.text)}>
      {dias} dias
    </span>
  );
}

export function KpisSection({
  estoqueTotal_kg,
  consumo,
  demanda,
  ofertaPasto,
  demandaLiquida,
}: KpisSectionProps) {
  const estoqueTon = (estoqueTotal_kg / 1000).toFixed(1);

  return (
    <div className="space-y-3">
      {/* Linha 1 — KPIs de silos (sem alteração) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Estoque Total
            </p>
            <p className="text-3xl font-bold">{estoqueTon}</p>
            <p className="text-sm text-muted-foreground">t MV</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Consumo Real/Dia
            </p>
            {consumo.consumo_medio_diario_kg !== null ? (
              <>
                <p className="text-3xl font-bold">
                  {consumo.consumo_medio_diario_kg.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">kg/dia</p>
              </>
            ) : (
              <p className="text-3xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Autonomia Real
            </p>
            <div className="mt-1">
              <AutonomiaBadge dias={consumo.autonomia_real_dias} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">pelo consumo histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Autonomia Projetada
            </p>
            <div className="mt-1">
              <AutonomiaBadge dias={demanda.autonomia_projetada_dias} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">pela demanda do rebanho</p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2 — KPIs de pastagens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-600/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Oferta de Pasto
            </p>
            <p className="text-3xl font-bold text-green-400">
              {ofertaPasto.oferta_total_kg_ms_dia.toFixed(0)}
            </p>
            <p className="text-sm text-muted-foreground">kg MS/dia</p>
          </CardContent>
        </Card>

        <Card className="border-green-600/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Demanda Líquida Silos
            </p>
            {demandaLiquida.pasto_cobre_tudo ? (
              <>
                <p className="text-lg font-bold text-green-400 mt-1">Pasto cobre tudo</p>
                <p className="text-xs text-muted-foreground">silos não necessários</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">
                  {demandaLiquida.demanda_liquida_kg_ms_dia.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">kg MS/dia (após pasto)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-600/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Autonomia Silos (líquida)
            </p>
            <div className="mt-1">
              {demandaLiquida.pasto_cobre_tudo ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold bg-green-500/10 text-green-400">
                  ∞
                </span>
              ) : (
                <AutonomiaBadge dias={demandaLiquida.autonomia_liquida_dias} />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">descontando oferta do pasto</p>
          </CardContent>
        </Card>

        <Card className="border-green-600/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Piquetes em Pastejo
            </p>
            <p className="text-3xl font-bold text-green-400">
              {ofertaPasto.por_piquete.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {ofertaPasto.epoca === 'verao' ? 'época de chuvas' : 'época de seca'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
