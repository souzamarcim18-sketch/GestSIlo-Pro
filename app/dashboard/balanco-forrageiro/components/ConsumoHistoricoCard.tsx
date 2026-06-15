import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';
import type { ResultadoConsumoReal } from '@/lib/utils/balanco-forrageiro';
import { cn } from '@/lib/utils';

type ConsumoHistoricoCardProps = {
  consumo: ResultadoConsumoReal;
};

export function ConsumoHistoricoCard({ consumo }: ConsumoHistoricoCardProps) {
  const autonomiaCls = classesAutonomia(consumo.autonomia_real_dias);

  if (consumo.sem_dados) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Consumo Histórico Real</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem saídas registradas nos últimos {consumo.periodo_dias} dias.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Consumo Histórico Real</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total no período</p>
            <p className="text-2xl font-bold">{consumo.consumo_total_kg.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Média diária</p>
            <p className="text-2xl font-bold">
              {consumo.consumo_medio_diario_kg?.toFixed(0) ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">kg/dia</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Autonomia real</p>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold',
              autonomiaCls.bg,
              autonomiaCls.text
            )}
          >
            {consumo.autonomia_real_dias} dias
          </span>
        </div>

        {consumo.por_silo.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Por silo</p>
            <div className="space-y-2">
              {consumo.por_silo.map((silo) => (
                <div key={silo.silo_id}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-sm text-foreground">{silo.nome}</span>
                    <span className="text-muted-foreground">{silo.percentual.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(silo.percentual, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
