'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLeiteiro } from '@/components/rebanho/leiteira/DashboardLeiteiro';
import { PainelEspecieReproducao } from '@/components/rebanho/reproducao/PainelEspecieReproducao';
import { IndicadoresEspecieSurface } from '@/components/rebanho/indicadores/IndicadoresEspecieSurface';

type DashboardLeiteiroProps = React.ComponentProps<typeof DashboardLeiteiro>;
type ReproducaoProps = Omit<
  React.ComponentProps<typeof PainelEspecieReproducao>,
  'especie' | 'isAdmin'
>;

interface LeiteiraPainelProps {
  producoes: DashboardLeiteiroProps['producoes'];
  animais: DashboardLeiteiroProps['animais'];
  totais: DashboardLeiteiroProps['totais'];
  isAdmin: boolean;
  reproducao: ReproducaoProps;
}

export function LeiteiraPainel({ producoes, animais, totais, isAdmin, reproducao }: LeiteiraPainelProps) {
  return (
    <Tabs defaultValue="producao" className="w-full">
      <TabsList variant="card">
        <TabsTrigger value="producao">Produção</TabsTrigger>
        <TabsTrigger value="reproducao">Reprodução</TabsTrigger>
        <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
      </TabsList>

      <TabsContent value="producao" className="mt-4">
        <DashboardLeiteiro producoes={producoes} animais={animais} totais={totais} />
      </TabsContent>

      <TabsContent value="reproducao" className="mt-4">
        <PainelEspecieReproducao especie="leiteiro" isAdmin={isAdmin} {...reproducao} />
      </TabsContent>

      <TabsContent value="indicadores" className="mt-4">
        <IndicadoresEspecieSurface especie="leiteiro" animais={reproducao.animais} />
      </TabsContent>
    </Tabs>
  );
}
