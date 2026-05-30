import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  ResultadoComparativo,
  ResultadoConsumoReal,
  ResultadoDemandaProjetada,
  ResultadoOfertaPasto,
  ResultadoDemandaLiquidaSilos,
} from '@/lib/utils/balanco-forrageiro';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';
import { cn } from '@/lib/utils';

type ComparativoSectionProps = {
  comparativo: ResultadoComparativo;
  consumo: ResultadoConsumoReal;
  demanda: ResultadoDemandaProjetada;
  ofertaPasto: ResultadoOfertaPasto;
  demandaLiquida: ResultadoDemandaLiquidaSilos;
};

const STATUS_CONFIG = {
  deficit: {
    label: 'Déficit',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  superavit: {
    label: 'Superávit',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  },
  equilibrado: {
    label: 'Equilibrado',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function ComparativoSection({
  comparativo,
  consumo,
  demanda,
  ofertaPasto,
  demandaLiquida,
}: ComparativoSectionProps) {
  const semDados = consumo.sem_dados || demanda.por_categoria.length === 0;
  const config = STATUS_CONFIG[comparativo.status];
  const autonomiaLiquidaClasses = classesAutonomia(demandaLiquida.autonomia_liquida_dias);

  return (
    <div className="space-y-3">
      {/* Comparativo original: consumo real vs demanda projetada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Comparativo: Consumo Real × Demanda Projetada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {semDados ? (
            <p className="text-sm text-muted-foreground">
              Dados insuficientes para comparativo.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border shrink-0',
                  config.className
                )}
              >
                {config.label}
              </span>

              <div className="flex flex-col gap-1">
                <p className="text-sm">
                  <span className="font-semibold">
                    {Math.abs(comparativo.saldo_diario_kg).toFixed(0)} kg/dia
                  </span>{' '}
                  — consumo real{' '}
                  <span className="font-medium">
                    {comparativo.saldo_diario_kg > 0 ? 'acima' : 'abaixo'}
                  </span>{' '}
                  da demanda projetada
                </p>

                {comparativo.diferenca_autonomia_dias !== null && (
                  <p className="text-sm text-muted-foreground">
                    Diferença de autonomia:{' '}
                    <span className="font-semibold text-foreground">
                      {Math.abs(comparativo.diferenca_autonomia_dias)} dias{' '}
                      {comparativo.diferenca_autonomia_dias < 0 ? 'a menos' : 'a mais'} que o projetado
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativo com pastagens: demanda líquida sobre silos */}
      <Card className="border-green-600/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Demanda Líquida sobre os Silos (descontando pasto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Demanda Total Rebanho
              </p>
              <p className="text-xl font-bold">
                {demanda.demanda_total_kg_ms_dia.toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">kg MS/dia</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Oferta de Pasto
              </p>
              <p className="text-xl font-bold text-green-400">
                − {ofertaPasto.oferta_total_kg_ms_dia.toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">kg MS/dia</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Demanda Líquida (silos)
              </p>
              {demandaLiquida.pasto_cobre_tudo ? (
                <p className="text-xl font-bold text-green-400">
                  0 <span className="text-sm font-normal text-muted-foreground ml-1">— pasto suficiente</span>
                </p>
              ) : (
                <p className="text-xl font-bold">
                  {demandaLiquida.demanda_liquida_kg_ms_dia.toFixed(0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kg MS/dia</span>
                </p>
              )}
            </div>
          </div>

          {!demandaLiquida.pasto_cobre_tudo && demandaLiquida.autonomia_liquida_dias !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Com o pasto descontado, os silos têm autonomia de{' '}
                <span
                  className={cn(
                    'font-semibold px-1.5 py-0.5 rounded-full text-xs',
                    autonomiaLiquidaClasses.bg,
                    autonomiaLiquidaClasses.text
                  )}
                >
                  {demandaLiquida.autonomia_liquida_dias} dias
                </span>
                {' '}para cobrir o restante da demanda.
              </p>
            </div>
          )}

          {demandaLiquida.pasto_cobre_tudo && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-green-400">
                ✓ A oferta das pastagens cobre 100% da demanda do rebanho. Os silos podem ser usados como reserva estratégica.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
