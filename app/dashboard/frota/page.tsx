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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Frota e Máquinas</h1>
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
        <div className="border-b border-border/30 bg-background/50 backdrop-blur-sm sticky top-0">
          <TabsList className="flex gap-0 bg-transparent border-0 p-0 h-auto px-6 md:px-8 rounded-none overflow-x-auto max-w-full">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Visão</span>
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <Truck className="h-4 w-4" aria-hidden="true" />
            <span>Cadastro</span>
          </TabsTrigger>
          <TabsTrigger value="uso" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Diário de Bordo</span>
            <span className="sm:hidden">Diário</span>
          </TabsTrigger>
          <TabsTrigger value="manutencoes" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            <span>Manutenções</span>
          </TabsTrigger>
          <TabsTrigger value="abastecimento" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <Fuel className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Abastecimento</span>
            <span className="sm:hidden">Abast.</span>
          </TabsTrigger>
          <TabsTrigger value="custos" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>Custos</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-b-transparent text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent whitespace-nowrap">
            <BarChart2 className="h-4 w-4" aria-hidden="true" />
            <span>Relatórios</span>
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
