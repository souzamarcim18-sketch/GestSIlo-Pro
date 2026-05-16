import Link from 'next/link';
import { History } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WizardContainer } from './components/WizardContainer';

export default function PlanejamentoSilagemPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Planejamento de Silagem
          </h1>
          <p className="text-muted-foreground mt-1">
            Calcule a demanda de silagem, estime a necessidade de área para plantio e dimensione seus silos em 4 etapas simples.
          </p>
        </div>
        <Link
          href="/dashboard/planejamento-silagem/historico"
          className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'shrink-0')}
        >
          <History className="h-4 w-4 mr-2" />
          Histórico de planejamentos
        </Link>
      </div>

      <WizardContainer />
    </div>
  );
}
