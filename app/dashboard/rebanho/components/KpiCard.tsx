import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  valor: string | number;
  sublabel?: string;
  icon: React.ReactNode;
}

/**
 * Card de KPI padronizado do módulo Rebanho.
 * Layout: ícone à esquerda + label, valor (text-3xl) e sublabel à direita.
 * Usado na página principal (PainelResumo) e nas páginas internas
 * (leiteira, corte, etc.) para visual consistente.
 */
export function KpiCard({ label, valor, sublabel, icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold leading-none text-foreground">{valor}</p>
          {sublabel && (
            <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
