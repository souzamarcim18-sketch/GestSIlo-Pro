'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalagemCalculator, NPKCalculator } from './components';
import { Beaker, Sprout } from 'lucide-react';

export default function CalculadorasPage() {
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
      <Tabs defaultValue="calagem" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="calagem" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Calagem
          </TabsTrigger>
          <TabsTrigger value="npk" className="flex items-center gap-2">
            <Sprout className="h-4 w-4" />
            Adubação NPK
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calagem" className="mt-6">
          <CalagemCalculator />
        </TabsContent>

        <TabsContent value="npk" className="mt-6">
          <NPKCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
