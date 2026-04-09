'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, CategoriaRebanho, PeriodoConfinamento, CicloAgricola, Silo } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCategoriasRebanho, getPeriodosConfinamento } from '@/lib/supabase/rebanho';
import { getSilosByFazenda } from '@/lib/supabase/silos';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Sprout, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Calculator,
  Scale
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function SimuladorForrageiroPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dados para cálculo de base
  const [categorias, setCategorias] = useState<CategoriaRebanho[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoConfinamento[]>([]);
  const [historicoCiclos, setHistoricoCiclos] = useState<CicloAgricola[]>([]);
  const [silos, setSilos] = useState<Silo[]>([]);
  
  // Estados do Simulador
  const [areaSimulada, setAreaSimulada] = useState<number>(10);
  const [produtividadeEsperada, setProdutividadeEsperada] = useState<number>(40);
  const [msEsperada, setMsEsperada] = useState<number>(32);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    const loadBaseData = async () => {
      try {
        if (!fazendaId) { setLoading(false); return; }

        const [cats, perds, silosData, ciclosData] = await Promise.all([
          getCategoriasRebanho(fazendaId),
          getPeriodosConfinamento(fazendaId),
          getSilosByFazenda(fazendaId),
          supabase.from('ciclos_agricolas').select('*').eq('fazenda_id', fazendaId).not('produtividade', 'is', null)
        ]);

        setCategorias(cats);
        setPeriodos(perds);
        setSilos(silosData);
        setHistoricoCiclos(ciclosData.data || []);

        if (perds.length > 0) {
          setSelectedPeriodoId(perds[0].id);
        }

        // Sugerir valores baseados no histórico
        if (ciclosData.data && ciclosData.data.length > 0) {
          const avgProd = (ciclosData.data as CicloAgricola[]).reduce((acc: number, c: CicloAgricola) => acc + (c.produtividade || 0), 0) / ciclosData.data.length;
          setProdutividadeEsperada(Math.round(avgProd));
        }

        if (silosData.length > 0) {
          const silosComMS = silosData.filter(s => s.materia_seca_percent);
          if (silosComMS.length > 0) {
            const avgMS = silosComMS.reduce((acc: number, s: Silo) => acc + (s.materia_seca_percent || 0), 0) / silosComMS.length;
            setMsEsperada(Math.round(avgMS));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados para o simulador');
      } finally {
        setLoading(false);
      }
    };
    loadBaseData();
  }, [authLoading, fazendaId]);

  const selectedPeriodo = useMemo(() => 
    periodos.find(p => p.id === selectedPeriodoId), 
  [periodos, selectedPeriodoId]);

  const resultados = useMemo(() => {
    if (!selectedPeriodo) return null;

    // 1. Necessidade do Rebanho (Demanda)
    const consumoDiarioMS_kg = categorias.reduce((acc: number, c: CategoriaRebanho) => 
      acc + (c.quantidade_cabecas * c.consumo_ms_kg_cab_dia), 0);
    
    const diasPeriodo = differenceInDays(
      parseISO(selectedPeriodo.data_fim),
      parseISO(selectedPeriodo.data_inicio)
    ) + 1;

    const necessidadeTotalMS = (consumoDiarioMS_kg / 1000) * diasPeriodo;

    // 2. Produção Estimada (Oferta)
    const producaoEstimadaMV = areaSimulada * produtividadeEsperada; // Tonelada Matéria Verde
    const producaoEstimadaMS = producaoEstimadaMV * (msEsperada / 100); // Tonelada Matéria Seca

    // 3. Saldo e Recomendações
    const saldo = producaoEstimadaMS - necessidadeTotalMS;
    const percentualCobertura = necessidadeTotalMS > 0 ? (producaoEstimadaMS / necessidadeTotalMS) * 100 : 0;
    
    const areaAdicionalNecessaria = saldo < 0 
      ? Math.abs(saldo) / (produtividadeEsperada * (msEsperada / 100))
      : 0;

    return {
      necessidadeTotalMS,
      producaoEstimadaMV,
      producaoEstimadaMS,
      saldo,
      percentualCobertura,
      areaAdicionalNecessaria,
      diasPeriodo
    };
  }, [selectedPeriodo, categorias, areaSimulada, produtividadeEsperada, msEsperada]);

  if (loading) {
    return <div className="p-8 text-center">Carregando simulador...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulador Forrageiro Sazonal</h1>
        <p className="text-muted-foreground">Planeje sua área de plantio com base na demanda futura do rebanho.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna de Inputs (Controles) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-green-100 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Parâmetros de Simulação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Período */}
              <div className="space-y-3">
                <Label className="font-bold">Período de Referência</Label>
                <select 
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                  value={selectedPeriodoId}
                  onChange={e => setSelectedPeriodoId(e.target.value)}
                >
                  {periodos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  A demanda de MS é buscada do Planejador de Rebanho para este período.
                </p>
              </div>

              {/* Área */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">Área de Plantio (ha)</Label>
                  <span className="text-lg font-black text-green-700">{areaSimulada} ha</span>
                </div>
                <Slider 
                  value={[areaSimulada]} 
                  onValueChange={(v) => setAreaSimulada(Array.isArray(v) ? v[0] : v)}
                  max={200}
                  step={0.5}
                  className="py-4"
                />
              </div>

              {/* Produtividade */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">Produtividade (ton MV/ha)</Label>
                  <span className="text-lg font-black text-green-700">{produtividadeEsperada} t/ha</span>
                </div>
                <Slider 
                  value={[produtividadeEsperada]} 
                  onValueChange={(v) => setProdutividadeEsperada(Array.isArray(v) ? v[0] : v)}
                  max={80}
                  step={1}
                  className="py-4"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Média histórica da fazenda: {historicoCiclos.length > 0 ? (historicoCiclos.reduce((acc: number, c: CicloAgricola) => acc + (c.produtividade || 0), 0) / historicoCiclos.length).toFixed(1) : '--'} t/ha
                </p>
              </div>

              {/* Matéria Seca */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">Teor de MS Esperado (%)</Label>
                  <span className="text-lg font-black text-green-700">{msEsperada}%</span>
                </div>
                <Slider 
                  value={[msEsperada]} 
                  onValueChange={(v) => setMsEsperada(Array.isArray(v) ? v[0] : v)}
                  min={20}
                  max={45}
                  step={1}
                  className="py-4"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Média dos seus silos: {silos.filter(s => s.materia_seca_percent).length > 0 ? (silos.filter(s => s.materia_seca_percent).reduce((acc: number, s: Silo) => acc + (s.materia_seca_percent || 0), 0) / silos.filter(s => s.materia_seca_percent).length).toFixed(1) : '--'}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna de Resultados */}
        <div className="lg:col-span-8 space-y-6">
          {resultados ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Oferta */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Produção Estimada (Oferta)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-green-600">{resultados.producaoEstimadaMS.toFixed(1)}</span>
                      <span className="text-sm font-bold text-muted-foreground">ton MS</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Equivalente a {resultados.producaoEstimadaMV.toFixed(0)} ton de Matéria Verde
                    </p>
                  </CardContent>
                </Card>

                {/* Card Demanda */}
                <Card className="border-l-4 border-l-rose-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Necessidade do Rebanho (Demanda)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-rose-600">{resultados.necessidadeTotalMS.toFixed(1)}</span>
                      <span className="text-sm font-bold text-muted-foreground">ton MS</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Para {resultados.diasPeriodo} dias de trato planejado
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Card de Saldo e Análise */}
              <Card className={`overflow-hidden border-2 ${resultados.saldo >= 0 ? 'border-green-500' : 'border-rose-500'}`}>
                <div className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${resultados.saldo >= 0 ? 'bg-green-50' : 'bg-rose-50'}`}>
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-xl font-black flex items-center gap-2 justify-center md:justify-start">
                      {resultados.saldo >= 0 ? (
                        <><CheckCircle2 className="text-green-600" /> Produção Suficiente</>
                      ) : (
                        <><AlertTriangle className="text-rose-600" /> Déficit de Produção</>
                      )}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {resultados.saldo >= 0 
                        ? `Você terá um excedente de ${resultados.saldo.toFixed(1)} ton MS (segurança de ${(resultados.percentualCobertura - 100).toFixed(1)}%).`
                        : `Faltarão ${Math.abs(resultados.saldo).toFixed(1)} ton MS para cobrir o período planejado.`}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Cobertura da Demanda</p>
                    <div className="text-4xl font-black">
                      {resultados.percentualCobertura.toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>DEMANDA</span>
                      <span>OFERTA</span>
                    </div>
                    <Progress 
                      value={Math.min(resultados.percentualCobertura, 100)} 
                      className={`h-4 ${resultados.saldo >= 0 ? 'bg-green-100' : 'bg-rose-100'}`}
                    />
                  </div>

                  {resultados.saldo < 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="p-4 rounded-xl bg-muted border flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
                        <div>
                          <p className="text-sm font-bold">Aumentar Área</p>
                          <p className="text-xs text-muted-foreground">
                            Você precisa plantar mais <strong>{resultados.areaAdicionalNecessaria.toFixed(1)} ha</strong> para atingir a autossuficiência.
                          </p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-muted border flex items-start gap-3">
                        <Scale className="w-5 h-5 text-amber-600 mt-1" />
                        <div>
                          <p className="text-sm font-bold">Comprar Silagem</p>
                          <p className="text-xs text-muted-foreground">
                            Será necessário adquirir aprox. <strong>{(Math.abs(resultados.saldo) / (msEsperada / 100)).toFixed(0)} ton</strong> de matéria verde.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultados.saldo >= 0 && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
                      <Info className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <p className="text-sm font-bold text-green-800">Dica de Gestão</p>
                        <p className="text-xs text-green-700">
                          Com um excedente de {resultados.saldo.toFixed(1)} ton MS, você tem uma margem de segurança contra quebras de safra ou pode considerar aumentar o rebanho em até {Math.floor(resultados.saldo / ((resultados.necessidadeTotalMS / categorias.reduce((a,c) => a + c.quantidade_cabecas, 0)) || 1))} cabeças.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabela de Memória de Cálculo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Memória de Cálculo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Produção de Matéria Verde (MV)</span>
                      <span className="font-mono">{areaSimulada} ha × {produtividadeEsperada} t/ha = {resultados.producaoEstimadaMV.toFixed(0)} ton</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Conversão para Matéria Seca (MS)</span>
                      <span className="font-mono">{resultados.producaoEstimadaMV.toFixed(0)} ton × {msEsperada}% = {resultados.producaoEstimadaMS.toFixed(1)} ton MS</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Demanda Total do Rebanho</span>
                      <span className="font-mono">{resultados.necessidadeTotalMS.toFixed(1)} ton MS</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold text-lg pt-4">
                      <span>Saldo Final</span>
                      <span className={resultados.saldo >= 0 ? 'text-green-600' : 'text-rose-600'}>
                        {resultados.saldo.toFixed(1)} ton MS
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <Sprout className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Dados insuficientes</CardTitle>
              <CardDescription className="mt-2">
                Certifique-se de ter categorias de rebanho e períodos de trato cadastrados no Planejador.
              </CardDescription>
              <Button onClick={() => window.location.href = '/dashboard/rebanho'} className="mt-6">
                Ir para o Planejador
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
