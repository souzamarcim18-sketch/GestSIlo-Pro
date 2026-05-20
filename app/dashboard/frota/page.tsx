'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, BookOpen, Truck, Fuel, Settings, Wrench, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFrotaData, type FrotaTab } from './hooks/useFrotaData';
import { FrotaOverview } from './components/FrotaOverview';
import { FrotaCadastro } from './components/FrotaCadastro';
import { FrotaDiarioBordo } from './components/FrotaDiarioBordo';
import { FrotaManutencoes } from './components/FrotaManutencoes';
import { FrotaAbastecimento } from './components/FrotaAbastecimento';
import { FrotaCustos } from './components/FrotaCustos';
import { FrotaRelatorios } from './components/FrotaRelatorios';

export default function FrotaPage() {
  const { profile } = useAuth();
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
    refreshAll,
  } = useFrotaData(activeTab);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Gestão de Frota e Máquinas</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Gerencie equipamentos, manutenções e abastecimentos da fazenda.
        </p>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FrotaTab)}
        className="w-full flex-1 flex flex-col"
      >
        <div className="px-6 md:px-8 pt-2 pb-4">
          <TabsList className="grid grid-cols-4 sm:grid-cols-7 gap-2 h-auto rounded-xl bg-muted/50 border border-border p-[3px] w-full">
            <TabsTrigger value="visao-geral" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="cadastro" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Cadastro</span>
            </TabsTrigger>
            <TabsTrigger value="uso" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Diário</span>
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
            <TabsTrigger value="relatorios" className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-[#00A651] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm whitespace-nowrap">
              <BarChart2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Content Area ──────────────────────────────────────────── */}
        <div className="flex-1 px-6 md:px-8 py-6 md:py-8 overflow-y-auto">

        {/* ── Visão Geral ───────────────────────────────────────────────── */}
        <TabsContent value="visao-geral" className="mt-6">
          <FrotaOverview
            maquinas={maquinas}
            usos={usos}
            manutencoes={manutencoes}
            abastecimentos={abastecimentos}
            planosManutencao={planos}
            loading={loading}
          />
        </TabsContent>

        {/* ── Cadastro ──────────────────────────────────────────────── */}
        <TabsContent value="cadastro" className="mt-6">
          <FrotaCadastro
            maquinas={maquinas}
            usos={usos}
            loading={loading}
            onRefresh={async () => {
              await refreshMaquinas();
              await refreshUsos();
            }}
            profile={profile}
          />
        </TabsContent>

        {/* ── Diário de Bordo ───────────────────────────────────────── */}
        <TabsContent value="uso" className="mt-6">
          <FrotaDiarioBordo
            maquinas={maquinas}
            usos={usos}
            talhoes={talhoes}
            loading={loading}
            onRefresh={refreshUsos}
          />
        </TabsContent>

        {/* ── Manutenções ───────────────────────────────────────────── */}
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

        {/* ── Abastecimento ─────────────────────────────────────────── */}
        <TabsContent value="abastecimento" className="mt-6">
          <FrotaAbastecimento
            maquinas={maquinas}
            abastecimentos={abastecimentos}
            loading={loading}
            onRefresh={refreshAbastecimentos}
          />
        </TabsContent>

        {/* ── Custos ────────────────────────────────────────────────── */}
        <TabsContent value="custos" className="mt-6">
          <FrotaCustos
            maquinas={maquinas}
            abastecimentos={abastecimentos}
            manutencoes={manutencoes}
            usos={usos}
            loading={loading}
          />
        </TabsContent>

        {/* ── Relatórios ────────────────────────────────────────────── */}
        <TabsContent value="relatorios" className="mt-6">
          <FrotaRelatorios
            maquinas={maquinas}
            usos={usos}
            manutencoes={manutencoes}
            abastecimentos={abastecimentos}
            loading={loading}
          />
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
