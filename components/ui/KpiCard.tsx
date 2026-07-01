import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  valor: string | number;
  sublabel?: string;
  icon: React.ReactNode;
}

/**
 * Card de KPI padronizado da plataforma.
 * Layout: ícone à esquerda + label, valor (text-2xl) e sublabel.
 * Fonte única do padrão de KPI — usado nas páginas principais dos módulos
 * (Rebanho, Silos, Pastagens, Lavouras) para visual consistente.
 */
export function KpiCard({ label, valor, sublabel, icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="truncate text-xl font-bold leading-tight text-foreground">{valor}</p>
          {sublabel && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-tight">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
