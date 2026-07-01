'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Beef, HeartPulse, BarChart3 } from 'lucide-react';
import { DashboardCorte } from '@/components/rebanho/corte/DashboardCorte';
import { PainelEspecieReproducao } from '@/components/rebanho/reproducao/PainelEspecieReproducao';
import { IndicadoresEspecieSurface } from '@/components/rebanho/indicadores/IndicadoresEspecieSurface';

const CARD_TAB =
  'group flex h-auto flex-col items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-center transition-all duration-150 after:hidden ' +
  'hover:bg-accent/50 hover:border-primary/30 ' +
  'data-active:!border-primary/60 data-active:!bg-primary/10 data-active:!text-foreground data-active:!shadow-none';

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
      <TabsList variant="line" className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0">
        <TabsTrigger value="desempenho" className={CARD_TAB}>
          <Beef className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
          <span className="text-sm font-semibold leading-tight">Desempenho</span>
        </TabsTrigger>
        <TabsTrigger value="reproducao" className={CARD_TAB}>
          <HeartPulse className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
          <span className="text-sm font-semibold leading-tight">Reprodução</span>
        </TabsTrigger>
        <TabsTrigger value="indicadores" className={CARD_TAB}>
          <BarChart3 className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
          <span className="text-sm font-semibold leading-tight">Indicadores</span>
        </TabsTrigger>
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
