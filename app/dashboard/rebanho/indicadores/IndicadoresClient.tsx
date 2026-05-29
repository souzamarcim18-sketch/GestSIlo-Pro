'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Download, RotateCw, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Lote } from '@/lib/types/rebanho';
import type {
  IndicadoresClientProps,
  FiltrosIndicadores,
  IndicadorRebanho,
} from '@/types/rebanho-indicadores';
import type { AlertasRebanho } from './page';
import dynamic from 'next/dynamic';
import { FiltrosIndicadores as FiltrosComponent } from './components/FiltrosIndicadores';
import { CardIndicador } from './components/CardIndicador';
import { Skeleton } from '@/components/ui/skeleton';

const GraficoGMD = dynamic(
  () => import('./components/charts/GraficoGMD').then((m) => ({ default: m.GraficoGMD })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const GraficoComposicao = dynamic(
  () => import('./components/charts/GraficoComposicao').then((m) => ({ default: m.GraficoComposicao })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const GraficoDistribuicaoEtaria = dynamic(
  () => import('./components/charts/GraficoDistribuicaoEtaria').then((m) => ({ default: m.GraficoDistribuicaoEtaria })),
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
  alertas,
}: IndicadoresClientProps & { lotes: Lote[]; alertas: AlertasRebanho }) {
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

      {/* Seção de Alertas */}
      {(alertas.vacinacoes.length > 0 ||
        alertas.partosPrevistos.length > 0 ||
        alertas.vacasSecasComParto.length > 0 ||
        alertas.semPesagem.length > 0) && (
        <div className="space-y-3">
          {/* Alerta 1: Vacinações */}
          {alertas.vacinacoes.length > 0 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-base">Vacinações Próximas/Vencidas</CardTitle>
                    <Badge variant="destructive" className="ml-2">
                      {alertas.vacinacoes.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alertas.vacinacoes.map((alerta: any) => (
                    <Link
                      key={alerta.id}
                      href={`/dashboard/rebanho/${alerta.animal_id}`}
                      className="block p-2 rounded border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                    >
                      <p className="text-sm font-medium">
                        {alerta.animais?.brinco || 'N/A'} - {alerta.vacina_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alerta.dias_para_vencimento} dias
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerta 2: Partos Previstos */}
          {alertas.partosPrevistos.length > 0 && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">Partos Previstos (30 dias)</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {alertas.partosPrevistos.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alertas.partosPrevistos.map((alerta: any) => (
                    <Link
                      key={alerta.id}
                      href={`/dashboard/rebanho/${alerta.id}`}
                      className="block p-2 rounded border border-blue-500/30 hover:bg-blue-500/10 transition-colors"
                    >
                      <p className="text-sm font-medium">{alerta.brinco} {alerta.nome && `- ${alerta.nome}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {alerta.categoria} • {alerta.data_parto_previsto}
                      </p>
                    </Link>
                  ))}
                </div>
                <Link href="/dashboard/rebanho/reproducao/eventos">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    Ver calendário reprodutivo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Alerta 3: Sem Pesagem */}
          {alertas.semPesagem.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-base">Sem Pesagem há 60+ Dias</CardTitle>
                    <Badge variant="destructive" className="ml-2">
                      {alertas.semPesagem.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alertas.semPesagem.map((alerta: any) => (
                    <Link
                      key={alerta.id}
                      href={`/dashboard/rebanho/${alerta.id}`}
                      className="block p-2 rounded border border-red-500/30 hover:bg-red-500/10 transition-colors"
                    >
                      <p className="text-sm font-medium">{alerta.brinco} {alerta.nome && `- ${alerta.nome}`}</p>
                      <p className="text-xs text-muted-foreground">{alerta.categoria}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerta 4: Vacas Secas com Parto */}
          {alertas.vacasSecasComParto.length > 0 && (
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base">Vacas Secas com Parto em 15 dias</CardTitle>
                    <Badge className="ml-2 bg-orange-100 text-orange-800">
                      {alertas.vacasSecasComParto.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alertas.vacasSecasComParto.map((alerta: any) => (
                    <Link
                      key={alerta.id}
                      href={`/dashboard/rebanho/${alerta.id}`}
                      className="block p-2 rounded border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                    >
                      <p className="text-sm font-medium">{alerta.brinco} {alerta.nome && `- ${alerta.nome}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Parto: {alerta.data_parto_previsto}
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Grid de Cards Indicadores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Indicadores Principais</CardTitle>
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
            {/* Comuns */}
            <CardIndicador
              nome="GMD (Ganho de Peso)"
              valor={indicadores.gmd}
              unidade="kg/dia"
              benchmark={{ min: 0.8, max: 1.5 }}
            />
            <CardIndicador
              nome="Taxa de Natalidade"
              valor={indicadores.taxaNatalidade}
              unidade="%"
              benchmark={{ min: 80, max: 95 }}
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
              nome="Taxa de Prenhez"
              valor={indicadores.taxaPrenhez}
              unidade="%"
              benchmark={{ min: 80, max: 95 }}
            />
            <CardIndicador
              nome="IEP (Intervalo Entre Partos)"
              valor={indicadores.iep}
              unidade="dias"
              benchmark={{ min: 380, max: 420 }}
            />
            <CardIndicador
              nome="IPP (Idade Primeiro Parto)"
              valor={indicadores.ipp}
              unidade="meses"
              benchmark={{ min: 22, max: 26 }}
            />
            <CardIndicador
              nome="Taxa de Reposição"
              valor={indicadores.taxaReposicao}
              unidade="%"
              benchmark={{ min: 20, max: 30 }}
            />

            {/* Específicos Corte */}
            {tipoExploracao !== 'LEITE' && indicadores.taxaDesfrute && (
              <CardIndicador
                nome="Taxa de Desfrute"
                valor={indicadores.taxaDesfrute}
                unidade="%"
                benchmark={{ min: 15, max: 25 }}
              />
            )}

            {/* Específicos Leite */}
            {tipoExploracao !== 'CORTE' && indicadores.percentualVacasLactacao && (
              <CardIndicador
                nome="% Vacas em Lactação"
                valor={indicadores.percentualVacasLactacao}
                unidade="%"
                benchmark={{ min: 70, max: 85 }}
              />
            )}
            {tipoExploracao !== 'CORTE' && indicadores.periodoSecoMedio && (
              <CardIndicador
                nome="Período Seco Médio"
                valor={indicadores.periodoSecoMedio}
                unidade="dias"
                benchmark={{ min: 45, max: 60 }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Gráficos */}
      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="gmd">GMD</TabsTrigger>
          <TabsTrigger value="composicao">Composição</TabsTrigger>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição Etária</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoDistribuicaoEtaria
                dados={
                  indicadores.composicaoRebanho.valor
                    ? Object.entries(indicadores.composicaoRebanho.valor).map(([categoria, percentual]) => ({
                        categoria,
                        percentual: typeof percentual === 'number' ? percentual : 0,
                      }))
                    : []
                }
                periodo={filtros}
              />
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
                dados={[]}
                modo="por-animal"
                periodo={filtros}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composicao">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composição do Rebanho</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoComposicao
                dados={indicadores.composicaoRebanho.valor || {}}
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
                dados={[]}
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
                dados={[]}
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
