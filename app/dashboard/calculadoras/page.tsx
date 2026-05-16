'use client';

import { useState } from 'react';
import { CalagemCalculator, NPKCalculator } from './components';
import { Beaker, Sprout } from 'lucide-react';

export default function CalculadorasPage() {
  const [activeTab, setActiveTab] = useState<'calagem' | 'npk'>('calagem');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Calculadoras Agronômicas
        </h1>
        <p className="text-muted-foreground mt-1">
          Ferramentas para cálculo de calagem e adubação NPK.
          Resultados indicativos — consulte seu agrônomo.
        </p>
      </div>

      {/* CALCULADORAS */}
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
            Adubação NPK
          </button>
        </div>

        {activeTab === 'calagem' && <CalagemCalculator />}
        {activeTab === 'npk' && <NPKCalculator />}
      </div>
    </div>
  );
}
