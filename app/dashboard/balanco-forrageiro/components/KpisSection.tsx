import { Card, CardContent } from '@/components/ui/card';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';
import type {
  ResultadoConsumoReal,
  ResultadoDemandaProjetada,
} from '@/lib/utils/balanco-forrageiro';
import { cn } from '@/lib/utils';

type KpisSectionProps = {
  estoqueTotal_kg: number;
  consumo: ResultadoConsumoReal;
  demanda: ResultadoDemandaProjetada;
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

export function KpisSection({ estoqueTotal_kg, consumo, demanda }: KpisSectionProps) {
  const estoqueTon = (estoqueTotal_kg / 1000).toFixed(1);

  return (
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
  );
}
