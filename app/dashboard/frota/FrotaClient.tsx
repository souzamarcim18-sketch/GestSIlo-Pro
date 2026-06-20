'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, Fuel, Settings, Wrench, LayoutDashboard } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useFrotaData, type FrotaTab } from './hooks/useFrotaData';

const FrotaOverview = dynamic(
  () => import('./components/FrotaOverview').then((m) => ({ default: m.FrotaOverview })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
import { MaquinasList } from './components/MaquinasList';
import { FrotaManutencoes } from './components/FrotaManutencoes';
import { FrotaAbastecimento } from './components/FrotaAbastecimento';
import { FrotaCustos } from './components/FrotaCustos';
import { MaquinaDialog } from './components/dialogs/MaquinaDialog';
import { UsoDialog } from './components/dialogs/UsoDialog';
import { ManutencaoDialog } from './components/dialogs/ManutencaoDialog';
import { AbastecimentoDialog } from './components/dialogs/AbastecimentoDialog';
import type { Maquina, Profile } from '@/lib/supabase';

interface Props {
  profile: Profile | null;
}

export function FrotaClient({ profile }: Props) {
  const [activeTab, setActiveTab] = useState<FrotaTab>('visao-geral');

  const {
    maquinas,
    usos,
    manutencoes,
    abastecimentos,
    talhoes,
    planos,
    loading,
    refreshMaquinas,
    refreshUsos,
    refreshManutencoes,
    refreshAbastecimentos,
    refreshPlanos,
  } = useFrotaData(activeTab);

  // Estado dos diálogos do hub (Visão Geral)
  const [novaOpen, setNovaOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | undefined>(undefined);
  const [usoTarget, setUsoTarget] = useState<Maquina | undefined>(undefined);
  const [manutencaoTarget, setManutencaoTarget] = useState<Maquina | undefined>(undefined);
  const [abastecimentoTarget, setAbastecimentoTarget] = useState<Maquina | undefined>(undefined);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Gestão de Frota e Maquinários</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Gerencie equipamentos, manutenções e abastecimentos da fazenda.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FrotaTab)}
        className="w-full flex-1 flex flex-col"
      >
        <div className="pt-2 pb-4">
          <TabsList className="grid grid-cols-4 gap-2 h-auto rounded-xl bg-muted/50 border border-border p-[3px] w-full">
            <TabsTrigger value="visao-geral" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="manutencoes" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Manutenções</span>
            </TabsTrigger>
            <TabsTrigger value="abastecimento" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <Fuel className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Abastec.</span>
            </TabsTrigger>
            <TabsTrigger value="custos" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Custos</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="visao-geral" className="mt-6 space-y-6">
            <FrotaOverview
              maquinas={maquinas}
              usos={usos}
              manutencoes={manutencoes}
              abastecimentos={abastecimentos}
              planosManutencao={planos}
              loading={loading}
              listaMaquinas={
                <MaquinasList
                  maquinas={maquinas}
                  usos={usos}
                  loading={loading}
                  profile={profile}
                  onNova={() => setNovaOpen(true)}
                  onEditar={(m) => setEditMaquina(m)}
                  onRegistrarUso={(m) => setUsoTarget(m)}
                  onRegistrarManutencao={(m) => setManutencaoTarget(m)}
                  onRegistrarAbastecimento={(m) => setAbastecimentoTarget(m)}
                  onRefresh={async () => {
                    await refreshMaquinas();
                    await refreshUsos();
                  }}
                />
              }
            />
          </TabsContent>

          <TabsContent value="manutencoes" className="mt-6">
            <FrotaManutencoes
              maquinas={maquinas}
              manutencoes={manutencoes}
              planosManutencao={planos}
              loading={loading}
              onRefreshManutencoes={refreshManutencoes}
              onRefreshPlanos={refreshPlanos}
              onRefreshMaquinas={refreshMaquinas}
              onMaquinaStatusChange={() => refreshMaquinas()}
            />
          </TabsContent>

          <TabsContent value="abastecimento" className="mt-6">
            <FrotaAbastecimento
              maquinas={maquinas}
              abastecimentos={abastecimentos}
              loading={loading}
              onRefresh={refreshAbastecimentos}
            />
          </TabsContent>

          <TabsContent value="custos" className="mt-6">
            <FrotaCustos
              maquinas={maquinas}
              abastecimentos={abastecimentos}
              manutencoes={manutencoes}
              usos={usos}
              loading={loading}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Diálogos do hub ──────────────────────────────────────────────────── */}
      <MaquinaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onSuccess={async () => {
          setNovaOpen(false);
          await refreshMaquinas();
        }}
      />
      <MaquinaDialog
        open={!!editMaquina}
        onOpenChange={(open) => { if (!open) setEditMaquina(undefined); }}
        maquina={editMaquina}
        onSuccess={async () => {
          setEditMaquina(undefined);
          await refreshMaquinas();
        }}
      />
      <UsoDialog
        open={!!usoTarget}
        onOpenChange={(open) => { if (!open) setUsoTarget(undefined); }}
        maquinas={usoTarget ? [usoTarget] : []}
        talhoes={talhoes}
        onSuccess={async () => {
          setUsoTarget(undefined);
          await refreshUsos();
        }}
      />
      <ManutencaoDialog
        open={!!manutencaoTarget}
        onOpenChange={(open) => { if (!open) setManutencaoTarget(undefined); }}
        maquinas={manutencaoTarget ? [manutencaoTarget] : []}
        onSuccess={async () => {
          setManutencaoTarget(undefined);
          await refreshManutencoes();
        }}
        onMaquinaStatusChange={() => refreshMaquinas()}
      />
      <AbastecimentoDialog
        open={!!abastecimentoTarget}
        onOpenChange={(open) => { if (!open) setAbastecimentoTarget(undefined); }}
        maquinas={abastecimentoTarget ? [abastecimentoTarget] : []}
        onSuccess={async () => {
          setAbastecimentoTarget(undefined);
          await refreshAbastecimentos();
        }}
      />
    </div>
  );
}
