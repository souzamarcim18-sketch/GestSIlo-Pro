import { WizardContainer } from './components/WizardContainer';

export default function PlanejamentoSilagemPage() {
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

      <WizardContainer />
    </div>
  );
}
