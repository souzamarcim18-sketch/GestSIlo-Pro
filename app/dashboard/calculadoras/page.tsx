'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, Insumo, Talhao } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getInsumosByFazenda } from '@/lib/supabase/insumos';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Beaker, Sprout, Download, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CalculadorasPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados Calculadora de Calagem ---
  const [calagemData, setCalagemData] = useState({
    al: '', ca: '', mg: '', v1: '', ctc: '', prnt: '80', v2: '60', area: '', metodo: 'saturacao'
  });

  // --- Estados Calculadora NPK ---
  const [npkData, setNpkData] = useState({
    n_nec: '', p_nec: '', k_nec: '', area: '', fertilizante_id: ''
  });

  useEffect(() => {
    if (authLoading) return;
    const loadData = async () => {
      try {
        if (!fazendaId) { setLoading(false); return; }
        const [insumosData, talhoesData] = await Promise.all([
          getInsumosByFazenda(fazendaId),
          supabase.from('talhoes').select('*').eq('fazenda_id', fazendaId)
        ]);
        setInsumos(insumosData);
        setTalhoes(talhoesData.data || []);
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [authLoading, fazendaId]);

  // --- Lógica Calagem ---
  const resultadoCalagem = useMemo(() => {
    const { al, ca, mg, v1, ctc, prnt, v2, area, metodo } = calagemData;
    if (!prnt || !area) return null;

    const valAl = parseFloat(al) || 0;
    const valCa = parseFloat(ca) || 0;
    const valMg = parseFloat(mg) || 0;
    const valV1 = parseFloat(v1) || 0;
    const valCTC = parseFloat(ctc) || 0;
    const valPRNT = parseFloat(prnt) || 80;
    const valV2 = parseFloat(v2) || 60;
    const valArea = parseFloat(area) || 0;

    let nc = 0; // Necessidade de Calagem em t/ha

    if (metodo === 'saturacao') {
      nc = ((valV2 - valV1) * valCTC) / (valPRNT * 10);
    } else if (metodo === 'al_ca_mg') {
      nc = (valAl * 2 + Math.max(0, 2 - (valCa + valMg))) / (valPRNT / 100);
    } else if (metodo === 'mg_manual') {
      nc = Math.max(0, (3 * valAl) + (2 - (valCa + valMg))) / (valPRNT / 100);
    }

    nc = Math.max(0, nc);
    const total = nc * valArea;

    return { nc, total };
  }, [calagemData]);

  // --- Lógica NPK ---
  const resultadoNPK = useMemo(() => {
    const { n_nec, p_nec, k_nec, area, fertilizante_id } = npkData;
    const fert = insumos.find(i => i.id === fertilizante_id);
    if (!fert || !area) return null;

    const valN = parseFloat(n_nec) || 0;
    const valP = parseFloat(p_nec) || 0;
    const valK = parseFloat(k_nec) || 0;
    const valArea = parseFloat(area) || 0;

    const teorN = fert.teor_n_percent || 0;
    const teorP = fert.teor_p_percent || 0;
    const teorK = fert.teor_k_percent || 0;

    // Cálculo simplificado baseado no nutriente limitante (o que exige mais do fertilizante escolhido)
    const doses = [
      teorN > 0 ? valN / (teorN / 100) : 0,
      teorP > 0 ? valP / (teorP / 100) : 0,
      teorK > 0 ? valK / (teorK / 100) : 0
    ];

    const dosePorHa = Math.max(...doses); // kg/ha
    const total = (dosePorHa * valArea) / 1000; // toneladas totais

    return { dosePorHa, total, fertNome: fert.nome };
  }, [npkData, insumos]);

  if (loading) return <div className="p-8 text-center">Carregando calculadoras...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calculadoras Agronômicas</h1>
        <p className="text-muted-foreground">Ferramentas de precisão para otimizar sua produção.</p>
      </div>

      <Tabs defaultValue="calagem" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="calagem" className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Calagem (NC)
          </TabsTrigger>
          <TabsTrigger value="npk" className="flex items-center gap-2">
            <Sprout className="w-4 h-4" />
            Adubação (NPK)
          </TabsTrigger>
        </TabsList>

        {/* --- ABA CALAGEM --- */}
        <TabsContent value="calagem" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Dados da Análise de Solo</CardTitle>
                <CardDescription>Insira os valores da sua análise laboratorial.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Método de Cálculo</Label>
                    <Select value={calagemData.metodo} onValueChange={(v: string | null) => v && setCalagemData({...calagemData, metodo: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saturacao">Saturação por Bases (V%)</SelectItem>
                        <SelectItem value="al_ca_mg">Neutralização de Alumínio</SelectItem>
                        <SelectItem value="mg_manual">Método MG (Alumínio + Ca+Mg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Área do Talhão (ha)</Label>
                    <Input type="number" step="0.1" value={calagemData.area} onChange={e => setCalagemData({...calagemData, area: e.target.value})} placeholder="Ex: 10" />
                  </div>
                  <div className="space-y-2">
                    <Label>PRNT do Calcário (%)</Label>
                    <Input type="number" value={calagemData.prnt} onChange={e => setCalagemData({...calagemData, prnt: e.target.value})} placeholder="Ex: 80" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Al³⁺ (cmolc/dm³)</Label>
                    <Input type="number" step="0.01" value={calagemData.al} onChange={e => setCalagemData({...calagemData, al: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ca²⁺ (cmolc/dm³)</Label>
                    <Input type="number" step="0.01" value={calagemData.ca} onChange={e => setCalagemData({...calagemData, ca: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mg²⁺ (cmolc/dm³)</Label>
                    <Input type="number" step="0.01" value={calagemData.mg} onChange={e => setCalagemData({...calagemData, mg: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTC (T) (cmolc/dm³)</Label>
                    <Input type="number" step="0.01" value={calagemData.ctc} onChange={e => setCalagemData({...calagemData, ctc: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>V% Atual (V1)</Label>
                    <Input type="number" step="0.1" value={calagemData.v1} onChange={e => setCalagemData({...calagemData, v1: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>V% Desejado (V2)</Label>
                    <Input type="number" step="0.1" value={calagemData.v2} onChange={e => setCalagemData({...calagemData, v2: e.target.value})} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Resultado (NC)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-green-700 font-bold uppercase">Necessidade de Calagem</p>
                    <p className="text-4xl font-black text-green-900">
                      {resultadoCalagem?.nc.toFixed(2) || '0.00'} <span className="text-lg">t/ha</span>
                    </p>
                  </div>
                  <div className="bg-white/50 p-4 rounded-xl border border-green-100 text-center">
                    <p className="text-xs text-green-700 font-bold uppercase">Total para a Área</p>
                    <p className="text-2xl font-black text-green-900">
                      {resultadoCalagem?.total.toFixed(1) || '0.0'} <span className="text-sm">toneladas</span>
                    </p>
                  </div>
                  <Button className="w-full bg-green-700 hover:bg-green-800">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Laudo PDF
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Dica Agronômica
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• Realize a calagem pelo menos 60 a 90 dias antes do plantio.</p>
                  <p>• A incorporação deve ser feita o mais profundamente possível para corrigir o perfil do solo.</p>
                  <p>• Verifique a necessidade de gessagem se houver alumínio em profundidade.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* --- ABA NPK --- */}
        <TabsContent value="npk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Planejamento de Adubação</CardTitle>
                <CardDescription>Calcule a dose de fertilizante com base na necessidade da cultura.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Área do Talhão (ha)</Label>
                    <Input type="number" step="0.1" value={npkData.area} onChange={e => setNpkData({...npkData, area: e.target.value})} placeholder="Ex: 10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fertilizante Disponível</Label>
                    <Select value={npkData.fertilizante_id} onValueChange={(v: string | null) => v && setNpkData({...npkData, fertilizante_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.filter(i => i.tipo === 'Fertilizante').map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.nome} ({i.teor_n_percent}-{i.teor_p_percent}-{i.teor_k_percent})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>N (kg/ha)</Label>
                    <Input type="number" value={npkData.n_nec} onChange={e => setNpkData({...npkData, n_nec: e.target.value})} placeholder="Dose N" />
                  </div>
                  <div className="space-y-2">
                    <Label>P₂O₅ (kg/ha)</Label>
                    <Input type="number" value={npkData.p_nec} onChange={e => setNpkData({...npkData, p_nec: e.target.value})} placeholder="Dose P" />
                  </div>
                  <div className="space-y-2">
                    <Label>K₂O (kg/ha)</Label>
                    <Input type="number" value={npkData.k_nec} onChange={e => setNpkData({...npkData, k_nec: e.target.value})} placeholder="Dose K" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Recomendação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-bold uppercase">Dose de {resultadoNPK?.fertNome || 'Fertilizante'}</p>
                    <p className="text-4xl font-black text-blue-900">
                      {resultadoNPK?.dosePorHa.toFixed(0) || '0'} <span className="text-lg">kg/ha</span>
                    </p>
                  </div>
                  <div className="bg-white/50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs text-blue-700 font-bold uppercase">Total para a Área</p>
                    <p className="text-2xl font-black text-blue-900">
                      {resultadoNPK?.total.toFixed(2) || '0.00'} <span className="text-sm">toneladas</span>
                    </p>
                  </div>
                  <Button className="w-full bg-blue-700 hover:bg-blue-800">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Recomendação
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Aviso de Nutrientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  O cálculo baseia-se no nutriente limitante para garantir a dose mínima necessária. Verifique se haverá excesso de outros nutrientes com a formulação escolhida.
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
