'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardReprodutivo } from '@/components/rebanho/reproducao/DashboardReprodutivo';
import { EventosListagem } from '@/components/rebanho/reproducao/EventosListagem';
import { ReproducaoSyncProvider } from '@/components/rebanho/reproducao/ReproducaoSyncProvider';
import { ReprodutoresClient } from '@/app/dashboard/rebanho/reproducao/reprodutores/ReprodutoresClient';
import { DoadorasClient } from '@/components/rebanho/reproducao/DoadorasClient';
import { ParametrosReprodutivosForm } from '@/components/rebanho/reproducao/ParametrosReprodutivosForm';
import type { EventoReprodutivo, ParametrosReprodutivosFazenda, Reprodutor } from '@/lib/types/rebanho-reproducao';
import type { Doadora } from '@/lib/types/rebanho-doadoras';
import type { Animal } from '@/lib/types/rebanho';
import type { AnimalRepetidora } from '@/lib/supabase/rebanho-reproducao';

interface AnimalOption {
  id: string;
  brinco: string;
  nome: string | null;
}

interface PainelEspecieReproducaoProps {
  especie: 'leiteiro' | 'corte';
  isAdmin: boolean;
  // Dados do dashboard reprodutivo (já filtrados por espécie no RSC)
  eventos: EventoReprodutivo[];
  animais: Animal[];
  repetidoras: AnimalRepetidora[];
  distribuicaoDetalhada: { key: string; label: string; value: number }[];
  indicadores: React.ComponentProps<typeof DashboardReprodutivo>['indicadores'];
  parametros: ParametrosReprodutivosFazenda | null;
  // Sub-abas
  reprodutores: Reprodutor[];
  doadoras: Doadora[];
  animaisFemea: AnimalOption[];
}

export function PainelEspecieReproducao({
  especie,
  isAdmin,
  eventos,
  animais,
  repetidoras,
  distribuicaoDetalhada,
  indicadores,
  parametros,
  reprodutores,
  doadoras,
  animaisFemea,
}: PainelEspecieReproducaoProps) {
  return (
    <ReproducaoSyncProvider>
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList variant="card">
        <TabsTrigger value="dashboard">Painel</TabsTrigger>
        <TabsTrigger value="historico">Histórico</TabsTrigger>
        <TabsTrigger value="reprodutores">Reprodutores</TabsTrigger>
        <TabsTrigger value="doadoras">Doadoras</TabsTrigger>
        <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-4">
        <DashboardReprodutivo
          eventos={eventos}
          animais={animais}
          repetidoras={repetidoras}
          distribuicaoDetalhada={distribuicaoDetalhada}
          indicadores={indicadores}
          parametros={parametros}
        />
      </TabsContent>

      <TabsContent value="historico" className="mt-4">
        <EventosListagem eventos={eventos} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="reprodutores" className="mt-4">
        <ReprodutoresClient
          initialReprodutores={reprodutores}
          isAdmin={isAdmin}
          especie={especie}
          embutido
        />
      </TabsContent>

      <TabsContent value="doadoras" className="mt-4">
        <DoadorasClient
          initialDoadoras={doadoras}
          isAdmin={isAdmin}
          especie={especie}
          animaisFemea={animaisFemea}
        />
      </TabsContent>

      <TabsContent value="parametros" className="mt-4">
        <ParametrosReprodutivosForm parametros={parametros} isAdmin={isAdmin} especie={especie} />
      </TabsContent>
    </Tabs>
    </ReproducaoSyncProvider>
  );
}
