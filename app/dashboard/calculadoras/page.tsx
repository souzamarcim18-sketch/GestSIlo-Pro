'use client';

import { useState } from 'react';
import { CalagemCalculator, NPKCalculator } from './components';
import { Beaker, Sprout } from 'lucide-react';

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
          Ferramentas para cálculo de calagem e melhor viabilidade de custos de adubos.
          Os resultados são indicativos — consulte sempre seu agrônomo.
        </p>
      </div>

      {/* Calculadoras */}
      <div className="w-full space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 border border-border p-[3px] max-w-md">
          <button
            onClick={() => setActiveTab('calagem')}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'calagem'
                ? 'bg-[#00A651] text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <Beaker className="h-4 w-4" />
            Calagem
          </button>
          <button
            onClick={() => setActiveTab('npk')}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'npk'
                ? 'bg-[#00A651] text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <Sprout className="h-4 w-4" />
            Viabilidade de fertilizantes
          </button>
        </div>

        {activeTab === 'calagem' && <CalagemCalculator />}
        {activeTab === 'npk' && <NPKCalculator />}
      </div>
    </div>
  );
}
