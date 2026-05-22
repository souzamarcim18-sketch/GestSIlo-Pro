import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  ResultadoComparativo,
  ResultadoConsumoReal,
  ResultadoDemandaProjetada,
} from '@/lib/utils/balanco-forrageiro';
import { cn } from '@/lib/utils';

type ComparativoSectionProps = {
  comparativo: ResultadoComparativo;
  consumo: ResultadoConsumoReal;
  demanda: ResultadoDemandaProjetada;
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

export function ComparativoSection({ comparativo, consumo, demanda }: ComparativoSectionProps) {
  const semDados =
    consumo.sem_dados || demanda.por_categoria.length === 0;

  const config = STATUS_CONFIG[comparativo.status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Comparativo: Consumo Real × Demanda Projetada</CardTitle>
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
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border',
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
  );
}
