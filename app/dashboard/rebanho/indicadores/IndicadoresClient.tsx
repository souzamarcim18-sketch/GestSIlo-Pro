'use client';

import { useState, useCallback, useEffect } from 'react';
import { Download, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Lote } from '@/lib/types/rebanho';
import type {
  IndicadoresClientProps,
  FiltrosIndicadores,
  IndicadorRebanho,
} from '@/types/rebanho-indicadores';
import dynamic from 'next/dynamic';
import { FiltrosIndicadores as FiltrosComponent } from './components/FiltrosIndicadores';
import { CardIndicador } from './components/CardIndicador';
import { Skeleton } from '@/components/ui/skeleton';

const GraficoGMD = dynamic(
  () => import('./components/charts/GraficoGMD').then((m) => ({ default: m.GraficoGMD })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const GraficoEvolucaoEfetivo = dynamic(
  () => import('./components/charts/GraficoEvolucaoEfetivo').then((m) => ({ default: m.GraficoEvolucaoEfetivo })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const GraficoNatalidadeMortalidade = dynamic(
  () => import('./components/charts/GraficoNatalidadeMortalidade').then((m) => ({ default: m.GraficoNatalidadeMortalidade })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const ComparativoLotes = dynamic(
  () => import('./components/charts/ComparativoLotes').then((m) => ({ default: m.ComparativoLotes })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

function getIndicadoresVazios(): IndicadorRebanho {
  return {
    gmd: { valor: null, estado: 'LOADING' },
    taxaNatalidade: { valor: null, estado: 'LOADING' },
    taxaMortalidadeGeral: { valor: null, estado: 'LOADING' },
    taxaMortalidadeBezerros: { valor: null, estado: 'LOADING' },
    taxaDescarte: { valor: null, estado: 'LOADING' },
    taxaPrenhez: { valor: null, estado: 'LOADING' },
    iep: { valor: null, estado: 'LOADING' },
    ipp: { valor: null, estado: 'LOADING' },
    pesoMedioPorCategoria: { valor: {}, estado: 'LOADING' },
    taxaReposicao: { valor: null, estado: 'LOADING' },
    evolucaoEfetivo: { valor: [], estado: 'LOADING' },
    composicaoRebanho: { valor: {}, estado: 'LOADING' },
    taxaDesfrute: { valor: null, estado: 'LOADING' },
    percentualVacasLactacao: { valor: null, estado: 'LOADING' },
    periodoSecoMedio: { valor: null, estado: 'LOADING' },
  };
}

export default function IndicadoresClient({
  initialFiltros,
  tipoExploracao,
  lotes,
}: IndicadoresClientProps & { lotes: Lote[] }) {
  const [filtros, setFiltros] = useState<FiltrosIndicadores>(initialFiltros);
  const [isLoading, setIsLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<IndicadorRebanho>(getIndicadoresVazios());

  const carregarIndicadores = useCallback(async (f: FiltrosIndicadores) => {
    setIsLoading(true);
    try {
      const { getIndicadoresAction } = await import('./actions');
      const result = await getIndicadoresAction(f);
      setIndicadores(result);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar indicadores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga inicial com filtros da URL
  useEffect(() => {
    carregarIndicadores(initialFiltros);
  // initialFiltros é prop do RSC — estável na montagem; carregarIndicadores é useCallback estável
  }, [carregarIndicadores, initialFiltros]);

  // Aplicar filtros
  const handleAplicarFiltros = useCallback(async (novosFiltros: FiltrosIndicadores) => {
    setFiltros(novosFiltros);
    await carregarIndicadores(novosFiltros);
    toast.success('Filtros aplicados com sucesso');
  }, [carregarIndicadores]);

  // Resetar filtros
  const handleResetar = useCallback(() => {
    const filtrosDefault: FiltrosIndicadores = { periodo: '90d' };
    setFiltros(filtrosDefault);
    carregarIndicadores(filtrosDefault);
  }, [carregarIndicadores]);

  // Atualizar filtros na URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filtros.periodo) params.set('periodo', filtros.periodo);
    if (filtros.dataInicio) params.set('dataInicio', typeof filtros.dataInicio === 'string' ? filtros.dataInicio : filtros.dataInicio.toISOString());
    if (filtros.dataFim) params.set('dataFim', typeof filtros.dataFim === 'string' ? filtros.dataFim : filtros.dataFim.toISOString());
    if (filtros.lotes?.length) params.set('lotes', filtros.lotes.join(','));
    if (filtros.categorias?.length) params.set('categorias', filtros.categorias.join(','));

    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [filtros]);

  // Export mocks
  const handleExportarPDF = useCallback(async () => {
    setIsLoading(true);
    try {
      const { exportarIndicadoresPDFAction } = await import('./actions');
      const blob = await exportarIndicadoresPDFAction(filtros);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `indicadores-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      toast.success('PDF exportado com sucesso');
    } catch {
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsLoading(false);
    }
  }, [filtros]);

  const handleExportarCSV = useCallback(async () => {
    setIsLoading(true);
    try {
      const { exportarIndicadoresCSVAction } = await import('./actions');
      const blob = await exportarIndicadoresCSVAction(filtros);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `indicadores-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('CSV exportado com sucesso');
    } catch {
      toast.error('Erro ao exportar CSV');
    } finally {
      setIsLoading(false);
    }
  }, [filtros]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <FiltrosComponent
        filtrosAtuais={filtros}
        tipoExploracao={tipoExploracao}
        onAplicar={handleAplicarFiltros}
        onResetar={handleResetar}
        lotes={lotes}
        isLoading={isLoading}
      />

      {/* Grid de Cards Indicadores — apenas zootécnicos de corte/efetivo.
          Reprodução, Leite e Composição vivem nas seções dedicadas da
          superfície única (sem duplicar leitura aqui). */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Indicadores de desempenho e efetivo</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAplicarFiltros(filtros)}
              disabled={isLoading}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CardIndicador
              nome="GMD (Ganho de Peso)"
              valor={indicadores.gmd}
              unidade="kg/dia"
              benchmark={{ min: 0.8, max: 1.5 }}
              mensagemInsuficiente="Registre ao menos 2 pesagens por animal para calcular o GMD"
              acaoInsuficiente={{ label: 'Registrar Pesagem', href: '/dashboard/rebanho/eventos/lote/novo' }}
            />
            <CardIndicador
              nome="Taxa de Natalidade"
              valor={indicadores.taxaNatalidade}
              unidade="%"
              benchmark={{ min: 80, max: 95 }}
              mensagemInsuficiente="Registre eventos de nascimento para calcular este indicador"
              acaoInsuficiente={{ label: 'Registrar Evento', href: '/dashboard/rebanho/eventos/lote/novo' }}
            />
            <CardIndicador
              nome="Taxa de Mortalidade Geral"
              valor={indicadores.taxaMortalidadeGeral}
              unidade="%"
              benchmark={{ min: 0, max: 5 }}
            />
            <CardIndicador
              nome="Taxa de Mortalidade (Bezerros)"
              valor={indicadores.taxaMortalidadeBezerros}
              unidade="%"
              benchmark={{ min: 0, max: 8 }}
            />
            <CardIndicador
              nome="Taxa de Descarte"
              valor={indicadores.taxaDescarte}
              unidade="%"
              benchmark={{ min: 10, max: 20 }}
            />
            <CardIndicador
              nome="Taxa de Reposição"
              valor={indicadores.taxaReposicao}
              unidade="%"
              benchmark={{ min: 20, max: 30 }}
            />

            {/* Específico Corte */}
            {tipoExploracao !== 'LEITE' && indicadores.taxaDesfrute && (
              <CardIndicador
                nome="Taxa de Desfrute"
                valor={indicadores.taxaDesfrute}
                unidade="%"
                benchmark={{ min: 15, max: 25 }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Gráficos — séries que só existem aqui (GMD por animal,
          natalidade×mortalidade, evolução do efetivo, comparativo de lotes). */}
      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList variant="card">
          <TabsTrigger value="resumo">Evolução do efetivo</TabsTrigger>
          <TabsTrigger value="gmd">GMD</TabsTrigger>
          <TabsTrigger value="natalidade">Natalidade</TabsTrigger>
          <TabsTrigger value="lotes">Comparativo Lotes</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Efetivo</CardTitle>
            </CardHeader>
            <CardContent>
              {indicadores.evolucaoEfetivo.valor && indicadores.evolucaoEfetivo.valor.length > 0 ? (
                <GraficoEvolucaoEfetivo
                  dados={indicadores.evolucaoEfetivo.valor}
                  periodo={filtros}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados para o período selecionado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gmd">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do GMD por Animal</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoGMD
                dados={indicadores.seriesGraficos?.gmdPorAnimal ?? []}
                modo="por-animal"
                periodo={filtros}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="natalidade">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Natalidade vs Mortalidade</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoNatalidadeMortalidade
                dados={indicadores.seriesGraficos?.natalidadeMortalidade ?? []}
                periodo={filtros}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lotes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativo Entre Lotes</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparativoLotes
                dados={indicadores.seriesGraficos?.comparativoLotes ?? []}
                indicador="gmd"
                periodo={filtros}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botões de Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar Relatório</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={handleExportarPDF}
            disabled={isLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            onClick={handleExportarCSV}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
