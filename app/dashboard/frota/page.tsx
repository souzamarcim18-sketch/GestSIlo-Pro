'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart2, BookOpen, Truck, Fuel, Settings, Wrench, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFrotaData, type FrotaTab } from './hooks/useFrotaData';
import { FrotaCadastro } from './components/FrotaCadastro';
import { FrotaDiarioBordo } from './components/FrotaDiarioBordo';
import { FrotaManutencoes } from './components/FrotaManutencoes';
import { FrotaAbastecimento } from './components/FrotaAbastecimento';

export default function FrotaPage() {
  useAuth();
  const [activeTab, setActiveTab] = useState<FrotaTab>('visao-geral');

  const {
    maquinas,
    usos,
    manutencoes,
    abastecimentos,
    talhoes,
    loading,
    refreshMaquinas,
    refreshUsos,
    refreshManutencoes,
    refreshAbastecimentos,
    refreshAll,
  } = useFrotaData(activeTab);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Frota e Máquinas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie equipamentos, manutenções e abastecimentos da fazenda.
        </p>
      </div>

      {/* ── Tabs principais ──────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FrotaTab)}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 w-full lg:w-auto">
          <TabsTrigger value="visao-geral" className="flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="cadastro" className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="uso" className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Diário de Bordo
          </TabsTrigger>
          <TabsTrigger value="manutencoes" className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            Manutenções
          </TabsTrigger>
          <TabsTrigger value="abastecimento" className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" aria-hidden="true" />
            Abastecimento
          </TabsTrigger>
          <TabsTrigger value="custos" className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Custos
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* ── Visão Geral (placeholder) ──────────────────────────────── */}
        <TabsContent value="visao-geral" className="mt-6">
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <LayoutDashboard className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
              <p className="text-lg font-semibold text-muted-foreground">Em desenvolvimento</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                KPIs consolidados de frota: ocupação, horas trabalhadas, custo/hora e alertas
                críticos de manutenção.
              </p>
            </CardContent>
          </Card>
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
            loading={loading}
            onRefresh={refreshManutencoes}
            onMaquinaStatusChange={(maquinaId, novoStatus) => {
              // Atualizar maquinas localmente sem precisar de re-fetch completo
              refreshMaquinas();
            }}
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

        {/* ── Custos (placeholder) ──────────────────────────────────── */}
        <TabsContent value="custos" className="mt-6">
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Settings className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
              <p className="text-lg font-semibold text-muted-foreground">Em desenvolvimento</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Análise de custo por máquina: combustível, manutenções, mão de obra e
                depreciação consolidados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Relatórios (placeholder) ──────────────────────────────── */}
        <TabsContent value="relatorios" className="mt-6">
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <BarChart2 className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
              <p className="text-lg font-semibold text-muted-foreground">Em desenvolvimento</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Relatórios de produtividade, consumo e histórico de manutenção por período.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
