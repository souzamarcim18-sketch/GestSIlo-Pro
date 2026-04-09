'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, CategoriaRebanho, PeriodoConfinamento, Silo, MovimentacaoSilo } from '@/lib/supabase';
import { getCategoriasRebanho, upsertCategoriaRebanho, deleteCategoriaRebanho, getPeriodosConfinamento, upsertPeriodoConfinamento, deletePeriodoConfinamento } from '@/lib/supabase/rebanho';
import { getSilosByFazenda } from '@/lib/supabase/silos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function PlanejadorRebanhoPage() {
  const [fazendaId, setFazendaId] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaRebanho[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoConfinamento[]>([]);
  const [silos, setSilos] = useState<Silo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');

  // Modais
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [isPeriodoModalOpen, setIsPeriodoModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Partial<CategoriaRebanho> | null>(null);
  const [editingPeriodo, setEditingPeriodo] = useState<Partial<PeriodoConfinamento> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('fazenda_id')
        .eq('id', user.id)
        .single();

      if (profile?.fazenda_id) {
        setFazendaId(profile.fazenda_id);
        const [cats, perds, silosData, movs] = await Promise.all([
          getCategoriasRebanho(profile.fazenda_id),
          getPeriodosConfinamento(profile.fazenda_id),
          getSilosByFazenda(profile.fazenda_id),
          supabase.from('movimentacoes_silo').select('*').in('silo_id', (await getSilosByFazenda(profile.fazenda_id)).map(s => s.id))
        ]);

        setCategorias(cats);
        setPeriodos(perds);
        setSilos(silosData);
        setMovimentacoes(movs.data || []);
        
        if (perds.length > 0) {
          setSelectedPeriodoId(perds[0].id);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao carregar dados:', error);
      }
      toast.error('Erro ao carregar dados do planejador');
    } finally {
      setLoading(false);
    }
  };

  const selectedPeriodo = useMemo(() => 
    periodos.find(p => p.id === selectedPeriodoId), 
  [periodos, selectedPeriodoId]);

  // Cálculos de Necessidade
  const calculos = useMemo(() => {
    if (!selectedPeriodo) return null;

    const consumoDiarioMS_kg = categorias.reduce((acc: number, c: CategoriaRebanho) => 
      acc + (c.quantidade_cabecas * c.consumo_ms_kg_cab_dia), 0);
    
    const consumoDiarioMS_ton = consumoDiarioMS_kg / 1000;

    const diasPeriodo = differenceInDays(
      parseISO(selectedPeriodo.data_fim),
      parseISO(selectedPeriodo.data_inicio)
    ) + 1;

    const necessidadeTotalMS = consumoDiarioMS_ton * diasPeriodo;

    // Estoque disponível em MS
    const estoqueMS = silos.reduce((acc: number, s: Silo) => {
      const estoqueAtualSilo = movimentacoes
        .filter(m => m.silo_id === s.id)
        .reduce((sum: number, m: MovimentacaoSilo) => m.tipo === 'Entrada' ? sum + m.quantidade : sum - m.quantidade, 0);
      
      return acc + (estoqueAtualSilo * (s.materia_seca_percent || 30) / 100);
    }, 0);

    const saldo = estoqueMS - necessidadeTotalMS;
    const diasCobertos = consumoDiarioMS_ton > 0 ? Math.floor(estoqueMS / consumoDiarioMS_ton) : 0;
    const percentualCobertura = necessidadeTotalMS > 0 ? (estoqueMS / necessidadeTotalMS) * 100 : 0;

    return {
      consumoDiarioMS_ton,
      diasPeriodo,
      necessidadeTotalMS,
      estoqueMS,
      saldo,
      diasCobertos,
      percentualCobertura
    };
  }, [selectedPeriodo, categorias, silos, movimentacoes]);

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fazendaId || !editingCategoria) return;

    try {
      await upsertCategoriaRebanho({ ...editingCategoria, fazenda_id: fazendaId });
      toast.success('Categoria salva com sucesso');
      setIsCategoriaModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleSavePeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fazendaId || !editingPeriodo) return;

    try {
      await upsertPeriodoConfinamento({ ...editingPeriodo, fazenda_id: fazendaId });
      toast.success('Período salvo com sucesso');
      setIsPeriodoModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar período');
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return;
    try {
      await deleteCategoriaRebanho(id);
      toast.success('Categoria excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    }
  };

  const handleDeletePeriodo = async (id: string) => {
    if (!confirm('Deseja excluir este período?')) return;
    try {
      await deletePeriodoConfinamento(id);
      toast.success('Período excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir período');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando planejador...</div>;
  }

  const chartData = [
    { name: 'Estoque MS', valor: calculos?.estoqueMS || 0, fill: '#16a34a' },
    { name: 'Necessidade MS', valor: calculos?.necessidadeTotalMS || 0, fill: '#ef4444' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planejador de Necessidade de Silagem</h1>
          <p className="text-muted-foreground">Cruze os dados de estoque com a demanda do seu rebanho.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isPeriodoModalOpen} onOpenChange={setIsPeriodoModalOpen}>
            <DialogTrigger
              render={
                <Button onClick={() => setEditingPeriodo({})} variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Novo Período
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Período de Trato</DialogTitle>
                <DialogDescription>Defina o intervalo de tempo para o planejamento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSavePeriodo} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Período</Label>
                  <Input 
                    value={editingPeriodo?.nome || ''} 
                    onChange={e => setEditingPeriodo({...editingPeriodo, nome: e.target.value})}
                    placeholder="Ex: Seca 2025" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input 
                      type="date" 
                      value={editingPeriodo?.data_inicio || ''} 
                      onChange={e => setEditingPeriodo({...editingPeriodo, data_inicio: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input 
                      type="date" 
                      value={editingPeriodo?.data_fim || ''} 
                      onChange={e => setEditingPeriodo({...editingPeriodo, data_fim: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar Período</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCategoriaModalOpen} onOpenChange={setIsCategoriaModalOpen}>
            <DialogTrigger
              render={
                <Button onClick={() => setEditingCategoria({})}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Categoria do Rebanho</DialogTitle>
                <DialogDescription>Adicione uma categoria de animais e seu consumo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveCategoria} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Categoria</Label>
                  <Input 
                    value={editingCategoria?.nome || ''} 
                    onChange={e => setEditingCategoria({...editingCategoria, nome: e.target.value})}
                    placeholder="Ex: Vacas em Lactação" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Qtd. Cabeças</Label>
                    <Input 
                      type="number" 
                      value={editingCategoria?.quantidade_cabecas || ''} 
                      onChange={e => setEditingCategoria({...editingCategoria, quantidade_cabecas: Number(e.target.value)})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumo MS (kg/cab/dia)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={editingCategoria?.consumo_ms_kg_cab_dia || ''} 
                      onChange={e => setEditingCategoria({...editingCategoria, consumo_ms_kg_cab_dia: Number(e.target.value)})}
                      required 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar Categoria</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seleção de Período Ativo */}
      <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border">
        <Label className="font-bold whitespace-nowrap">Período de Planejamento:</Label>
        <select 
          className="bg-background border rounded-md px-3 py-2 w-full max-w-xs"
          value={selectedPeriodoId}
          onChange={e => setSelectedPeriodoId(e.target.value)}
        >
          {periodos.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} ({format(parseISO(p.data_inicio), 'dd/MM/yy')} a {format(parseISO(p.data_fim), 'dd/MM/yy')})
            </option>
          ))}
        </select>
        {selectedPeriodo && (
          <Button variant="ghost" size="icon" onClick={() => handleDeletePeriodo(selectedPeriodo.id)} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {calculos ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Status Principal */}
          <Card className={`lg:col-span-1 border-t-4 ${
            calculos.saldo < 0 ? 'border-t-red-500' : 
            calculos.percentualCobertura < 115 ? 'border-t-amber-500' : 'border-t-green-500'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Status do Estoque
                {calculos.saldo < 0 ? <AlertTriangle className="text-red-500" /> : <CheckCircle2 className="text-green-500" />}
              </CardTitle>
              <CardDescription>Análise para o período {selectedPeriodo?.nome}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground uppercase font-bold">Saldo de Matéria Seca</p>
                <p className={`text-4xl font-black ${calculos.saldo < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {calculos.saldo.toFixed(1)} ton MS
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Dias Cobertos</p>
                  <p className="text-xl font-bold">{calculos.diasCobertos} dias</p>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Cobertura</p>
                  <p className="text-xl font-bold">{calculos.percentualCobertura.toFixed(0)}%</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Resumo do Planejamento:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>Duração do Período:</span>
                    <span className="font-bold">{calculos.diasPeriodo} dias</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Consumo Diário (MS):</span>
                    <span className="font-bold">{calculos.consumoDiarioMS_ton.toFixed(2)} ton</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Necessidade Total (MS):</span>
                    <span className="font-bold">{calculos.necessidadeTotalMS.toFixed(1)} ton</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Estoque Atual (MS):</span>
                    <span className="font-bold">{calculos.estoqueMS.toFixed(1)} ton</span>
                  </li>
                </ul>
              </div>

              {calculos.saldo < 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-sm">
                  <p className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Atenção: Déficit Detectado
                  </p>
                  <p className="mt-1">
                    Seu estoque não cobre todo o período. Você precisará de mais <strong>{Math.abs(calculos.saldo).toFixed(1)} ton MS</strong> ou reduzir o período de trato.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico e Tabelas */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estoque vs. Necessidade (ton MS)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Categorias do Rebanho</CardTitle>
                  <CardDescription>Animais que consomem a silagem neste período.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead className="text-right">Consumo (kg MS/dia)</TableHead>
                      <TableHead className="text-right">Total (ton MS/dia)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorias.map(cat => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.nome}</TableCell>
                        <TableCell className="text-right">{cat.quantidade_cabecas}</TableCell>
                        <TableCell className="text-right">{cat.consumo_ms_kg_cab_dia.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-bold">
                          {((cat.quantidade_cabecas * cat.consumo_ms_kg_cab_dia) / 1000).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategoria(cat.id)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categorias.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhuma categoria cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Calculator className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>Nenhum período de planejamento</CardTitle>
          <CardDescription className="mt-2">
            Crie um período de trato (ex: Seca 2025) para começar a planejar sua necessidade de silagem.
          </CardDescription>
          <Button onClick={() => setIsPeriodoModalOpen(true)} className="mt-6">
            Criar Primeiro Período
          </Button>
        </Card>
      )}
    </div>
  );
}
