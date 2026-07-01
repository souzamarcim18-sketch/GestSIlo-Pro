'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardCorte } from '@/components/rebanho/corte/DashboardCorte';
import { PainelEspecieReproducao } from '@/components/rebanho/reproducao/PainelEspecieReproducao';
import { IndicadoresEspecieSurface } from '@/components/rebanho/indicadores/IndicadoresEspecieSurface';

type DashboardCorteProps = React.ComponentProps<typeof DashboardCorte>;
type ReproducaoProps = Omit<
  React.ComponentProps<typeof PainelEspecieReproducao>,
  'especie' | 'isAdmin'
>;

interface CortePainelProps {
  animais: DashboardCorteProps['animais'];
  lotes: DashboardCorteProps['lotes'];
  pesos: DashboardCorteProps['pesos'];
  data90dias: string;
  isAdmin: boolean;
  reproducao: ReproducaoProps;
}

export function CortePainel({ animais, lotes, pesos, data90dias, isAdmin, reproducao }: CortePainelProps) {
  return (
    <Tabs defaultValue="desempenho" className="w-full">
      <TabsList variant="card">
        <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
        <TabsTrigger value="reproducao">Reprodução</TabsTrigger>
        <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
      </TabsList>

      <TabsContent value="desempenho" className="mt-4">
        <DashboardCorte animais={animais} lotes={lotes} pesos={pesos} data90dias={data90dias} />
      </TabsContent>

      <TabsContent value="reproducao" className="mt-4">
        <PainelEspecieReproducao especie="corte" isAdmin={isAdmin} {...reproducao} />
      </TabsContent>

      <TabsContent value="indicadores" className="mt-4">
        <IndicadoresEspecieSurface especie="corte" animais={reproducao.animais} />
      </TabsContent>
    </Tabs>
  );
}
