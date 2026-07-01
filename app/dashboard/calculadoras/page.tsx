'use client';

import { useState } from 'react';
import { CalagemCalculator, NPKCalculator } from './components';

export default function CalculadorasPage() {
  const [activeTab, setActiveTab] = useState<'calagem' | 'npk'>('calagem');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">
          Calculadoras Agronômicas
        </h2>
        <p className="text-muted-foreground mt-1">
          Ferramentas para cálculo de calagem e melhor viabilidade de custos de fertilizantes.
          Os resultados são indicativos — consulte sempre seu agrônomo.
        </p>
      </div>

      {/* Calculadoras */}
      <div className="w-full space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('calagem')}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'calagem'
                ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-accent/50 hover:border-primary/30'
            }`}
          >
            Calagem
          </button>
          <button
            onClick={() => setActiveTab('npk')}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'npk'
                ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-accent/50 hover:border-primary/30'
            }`}
          >
            Viabilidade de fertilizantes
          </button>
        </div>

        {activeTab === 'calagem' && <CalagemCalculator />}
        {activeTab === 'npk' && <NPKCalculator />}
      </div>
    </div>
  );
}
