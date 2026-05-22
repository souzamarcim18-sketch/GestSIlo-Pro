import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { classesAutonomia } from '@/lib/utils/balanco-forrageiro';
import type { ResultadoDemandaProjetada } from '@/lib/utils/balanco-forrageiro';
import { cn } from '@/lib/utils';

type DemandaProjetadaCardProps = {
  demanda: ResultadoDemandaProjetada;
  estoqueTotal_kg: number;
};

export function DemandaProjetadaCard({ demanda }: DemandaProjetadaCardProps) {
  const autonomiaCls = classesAutonomia(demanda.autonomia_projetada_dias);

  if (demanda.por_categoria.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Demanda Projetada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum animal ativo cadastrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Demanda Projetada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left py-1.5 pr-2 font-semibold">Categoria</th>
                <th className="text-right py-1.5 px-2 font-semibold">Qtd</th>
                <th className="text-right py-1.5 px-2 font-semibold">Unit</th>
                <th className="text-right py-1.5 pl-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {demanda.por_categoria.map((linha) => (
                <tr key={linha.categoria} className="border-b border-border/50">
                  <td className="py-1.5 pr-2">
                    {linha.categoria}
                    {linha.estimado && (
                      <span className="ml-1 text-muted-foreground text-xs">~</span>
                    )}
                  </td>
                  <td className="text-right py-1.5 px-2 text-muted-foreground">
                    {linha.quantidade}
                  </td>
                  <td className="text-right py-1.5 px-2 text-muted-foreground">
                    {linha.consumo_unitario_kg_ms_dia} kg
                  </td>
                  <td className="text-right py-1.5 pl-2 font-medium">
                    {linha.consumo_total_kg_ms_dia.toFixed(0)} kg
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Total/dia
                </td>
                <td className="text-right pt-2 font-bold text-sm">
                  {demanda.demanda_total_kg_ms_dia.toFixed(0)} kg MS
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Autonomia projetada</p>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold',
              autonomiaCls.bg,
              autonomiaCls.text
            )}
          >
            {demanda.autonomia_projetada_dias} dias
          </span>
        </div>

        {demanda.tem_categorias_estimadas && (
          <p className="text-xs text-muted-foreground">
            * Categorias marcadas com ~ usam valor estimado de 7 kg MS/cab/dia
          </p>
        )}
      </CardContent>
    </Card>
  );
}
