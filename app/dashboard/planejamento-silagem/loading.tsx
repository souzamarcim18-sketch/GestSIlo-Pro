import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanejamentoSilagemLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Planejamento de Silagem
        </h1>
        <p className="text-muted-foreground mt-1">
          Calcule a demanda de silagem e dimensione seus silos em 4 etapas simples.
        </p>
      </div>

      <Card className="p-6 md:p-8">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-12" />
              {i < 4 && <Skeleton className="h-4 w-4" />}
            </div>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="space-y-4 mt-8">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />

          {/* Card grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>

          {/* Button skeleton */}
          <div className="flex gap-3 mt-8">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </Card>
    </div>
  );
}
