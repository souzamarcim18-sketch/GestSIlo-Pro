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
  useAuth();
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
    <div className="p-6 md:p-8">
      {/* ── Tabs principais ──────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FrotaTab)}
        className="w-full"
      >
        {/* ── Header + Tabs na mesma linha ───────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Frota e Máquinas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie equipamentos, manutenções e abastecimentos da fazenda.
            </p>
          </div>

          <TabsList className="flex flex-wrap gap-1.5 bg-muted/40 border border-border/50 p-1.5 rounded-xl h-auto self-start sm:self-center">
          <TabsTrigger value="visao-geral" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Visão</span>
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <Truck className="h-4 w-4" aria-hidden="true" />
            <span>Cadastro</span>
          </TabsTrigger>
          <TabsTrigger value="uso" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Diário de Bordo</span>
            <span className="sm:hidden">Diário</span>
          </TabsTrigger>
          <TabsTrigger value="manutencoes" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            <span>Manutenções</span>
          </TabsTrigger>
          <TabsTrigger value="abastecimento" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <Fuel className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Abastecimento</span>
            <span className="sm:hidden">Abast.</span>
          </TabsTrigger>
          <TabsTrigger value="custos" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>Custos</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-background/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold">
            <BarChart2 className="h-4 w-4" aria-hidden="true" />
            <span>Relatórios</span>
          </TabsTrigger>
        </TabsList>
        </div>

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
      </Tabs>
    </div>
  );
}
