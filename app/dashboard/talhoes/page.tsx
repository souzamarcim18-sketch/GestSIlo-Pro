'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Map, Sprout, Tractor, CheckCircle2, Clock, DollarSign, Calendar, Search, ClipboardList, Droplets, FlaskConical, Shovel } from 'lucide-react';
import { toast } from 'sonner';
import { type Talhao, type CicloAgricola, type AtividadeCampo, type Insumo, type Maquina } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { getCustoTalhaoPeriodo } from '@/lib/supabase/talhoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TalhoesPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [ciclos, setCiclos] = useState<CicloAgricola[]>([]);
  const [atividades, setAtividades] = useState<AtividadeCampo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTalhaoOpen, setIsAddTalhaoOpen] = useState(false);
  const [isAddCicloOpen, setIsAddCicloOpen] = useState(false);
  const [isAddAtividadeOpen, setIsAddAtividadeOpen] = useState(false);

  // Cost tool state
  const [costTalhaoId, setCostTalhaoId] = useState<string>('');
  const [costStartDate, setCostStartDate] = useState<string>('');
  const [costEndDate, setCostEndDate] = useState<string>('');
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Form states
  const [newTalhao, setNewTalhao] = useState({ nome: '', area: '', tipo_solo: '', localizacao: '' });
  const [newCiclo, setNewCiclo] = useState({ talhao_id: '', cultura: '', data_plantio: '', data_colheita_prevista: '' });
  const [newAtividade, setNewAtividade] = useState({
    talhao_id: '',
    tipo_atividade: 'Preparo de Solo' as AtividadeCampo['tipo_atividade'],
    data_atividade: format(new Date(), 'yyyy-MM-dd'),
    custo_total: '',
    observacoes: '',
    dados: {} as any
  });

  const fetchData = useCallback(async () => {
    if (!fazendaId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [talhoesData, insumosData, maquinasData, atividadesData] = await Promise.all([
        q.talhoes.list(),
        q.insumos.list(),
        q.maquinas.list(),
        q.atividadesCampo.list(),
      ]);

      setTalhoes(talhoesData);
      setInsumos(insumosData);
      setMaquinas(maquinasData);
      setAtividades(atividadesData);

      if (talhoesData.length > 0) {
        const ciclosData = await q.ciclosAgricolas.listByTalhoes(talhoesData.map(t => t.id));
        setCiclos(ciclosData);
      }
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [fazendaId]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const handleAddTalhao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await q.talhoes.create({
        nome: newTalhao.nome,
        area: Number(newTalhao.area),
        tipo_solo: newTalhao.tipo_solo || null,
        localizacao: newTalhao.localizacao || null,
        fazenda_id: '',
        status: 'Em pousio'
      });
      toast.success('Talhão cadastrado com sucesso!');
      setIsAddTalhaoOpen(false);
      fetchData();
      setNewTalhao({ nome: '', area: '', tipo_solo: '', localizacao: '' });
    } catch {
      toast.error('Erro ao cadastrar talhão');
    }
  };

  const handleAddCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await q.ciclosAgricolas.create({
        talhao_id: newCiclo.talhao_id,
        cultura: newCiclo.cultura,
        data_plantio: newCiclo.data_plantio,
        data_colheita_prevista: newCiclo.data_colheita_prevista || null,
        data_colheita_real: null,
        produtividade: null
      });
      toast.success('Ciclo registrado com sucesso!');
      setIsAddCicloOpen(false);
      fetchData();
      setNewCiclo({ talhao_id: '', cultura: '', data_plantio: '', data_colheita_prevista: '' });
    } catch {
      toast.error('Erro ao registrar ciclo');
    }
  };

  const handleAddAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      {
        const cicloAtivo = ciclos.find(c => c.talhao_id === newAtividade.talhao_id && !c.data_colheita_real);

        await q.atividadesCampo.create({
          fazenda_id: '',
          talhao_id: newAtividade.talhao_id,
          ciclo_id: cicloAtivo?.id || null,
          tipo_atividade: newAtividade.tipo_atividade,
          data_atividade: newAtividade.data_atividade,
          custo_total: newAtividade.custo_total ? Number(newAtividade.custo_total) : null,
          observacoes: newAtividade.observacoes,
          dados_json: newAtividade.dados
        });

        // Se for colheita, atualizar o ciclo
        if (newAtividade.tipo_atividade === 'Colheita' && cicloAtivo) {
          await q.ciclosAgricolas.update(cicloAtivo.id, {
            data_colheita_real: newAtividade.data_atividade,
            produtividade: Number(newAtividade.dados.produtividade_ton_ha)
          });
        }

        toast.success('Atividade registrada com sucesso!');
        setIsAddAtividadeOpen(false);
        fetchData();
        setNewAtividade({
          talhao_id: '',
          tipo_atividade: 'Preparo de Solo',
          data_atividade: format(new Date(), 'yyyy-MM-dd'),
          custo_total: '',
          observacoes: '',
          dados: {}
        });
      }
    } catch {
      toast.error('Erro ao registrar atividade');
    }
  };

  const handleCalculateCost = async () => {
    if (!costTalhaoId || !costStartDate || !costEndDate) {
      toast.error('Preencha todos os campos para calcular');
      return;
    }
    setCalculating(true);
    try {
      const cost = await getCustoTalhaoPeriodo(costTalhaoId, costStartDate, costEndDate);
      setCalculatedCost(cost);
    } catch (error) {
      toast.error('Erro ao calcular custo');
    } finally {
      setCalculating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Plantado': return <Badge className="bg-primary/100 hover:bg-primary dark:bg-primary dark:hover:bg-primary/90"><Sprout className="w-3 h-3 mr-1" /> Plantado</Badge>;
      case 'Em preparo': return <Badge className="bg-secondary/100 hover:bg-secondary dark:bg-secondary/30 dark:hover:bg-secondary/40 dark:text-secondary"><Tractor className="w-3 h-3 mr-1" /> Em preparo</Badge>;
      case 'Colhido': return <Badge className="bg-[--status-info]/10 hover:bg-[--status-info]/10 dark:bg-[--status-info]/10/30 dark:hover:bg-[--status-info]/10/40 dark:text-[--status-info]"><CheckCircle2 className="w-3 h-3 mr-1" /> Colhido</Badge>;
      case 'Em pousio': return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Em pousio</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Talhões</h2>
        <div className="flex gap-2">
          <Dialog open={isAddAtividadeOpen} onOpenChange={setIsAddAtividadeOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 dark:border-primary dark:text-primary dark:hover:bg-primary/10">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Registrar Atividade
                </Button>
              }
            />
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registro de Atividade de Campo</DialogTitle>
                <DialogDescription>Documente as operações técnicas realizadas no talhão.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAtividade} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Talhão</Label>
                    <Select onValueChange={(v: string | null) => v && setNewAtividade({ ...newAtividade, talhao_id: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Atividade</Label>
                    <Select onValueChange={(v: any) => v && setNewAtividade({ ...newAtividade, tipo_atividade: v, dados: {} })} defaultValue="Preparo de Solo">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Preparo de Solo">Preparo de Solo</SelectItem>
                        <SelectItem value="Calagem">Calagem</SelectItem>
                        <SelectItem value="Gessagem">Gessagem</SelectItem>
                        <SelectItem value="Plantio">Plantio</SelectItem>
                        <SelectItem value="Pulverização">Pulverização</SelectItem>
                        <SelectItem value="Colheita">Colheita</SelectItem>
                        <SelectItem value="Análise de Solo">Análise de Solo</SelectItem>
                        <SelectItem value="Irrigação">Irrigação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={newAtividade.data_atividade} onChange={(e) => setNewAtividade({ ...newAtividade, data_atividade: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo Total (R$)</Label>
                    <Input type="number" step="0.01" value={newAtividade.custo_total} onChange={(e) => setNewAtividade({ ...newAtividade, custo_total: e.target.value })} />
                  </div>
                </div>

                {/* Campos dinâmicos baseados no tipo */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" />
                    Dados Técnicos: {newAtividade.tipo_atividade}
                  </h4>
                  
                  {newAtividade.tipo_atividade === 'Preparo de Solo' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Tipo de Operação</Label>
                        <Select onValueChange={(v: string | null) => v && setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, tipo_operacao: v } })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aração">Aração</SelectItem>
                            <SelectItem value="Gradagem">Gradagem</SelectItem>
                            <SelectItem value="Subsolagem">Subsolagem</SelectItem>
                            <SelectItem value="Escarificação">Escarificação</SelectItem>
                            <SelectItem value="Nivelamento">Nivelamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Horas Máquina</Label>
                        <Input type="number" step="0.1" onChange={(e) => setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, horas_maquina: e.target.value } })} />
                      </div>
                    </div>
                  )}

                  {(newAtividade.tipo_atividade === 'Calagem' || newAtividade.tipo_atividade === 'Gessagem') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Insumo</Label>
                        <Select onValueChange={(v: string | null) => v && setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, insumo_id: v } })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Dose (kg/ha)</Label>
                        <Input type="number" onChange={(e) => setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, dose_por_hectare_kg: e.target.value } })} />
                      </div>
                    </div>
                  )}

                  {newAtividade.tipo_atividade === 'Plantio' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Semente</Label>
                        <Select onValueChange={(v: string | null) => v && setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, semente_id: v } })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {insumos.filter(i => i.tipo === 'Semente').map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">População (plantas/ha)</Label>
                        <Input type="number" onChange={(e) => setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, populacao_plantas_ha: e.target.value } })} />
                      </div>
                    </div>
                  )}

                  {newAtividade.tipo_atividade === 'Pulverização' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Insumo (Defensivo)</Label>
                        <Select onValueChange={(v: string | null) => v && setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, insumo_id: v } })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {insumos.filter(i => i.tipo === 'Defensivo').map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Dose (L/ha)</Label>
                        <Input type="number" step="0.1" onChange={(e) => setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, dose_por_hectare: e.target.value } })} />
                      </div>
                    </div>
                  )}

                  {newAtividade.tipo_atividade === 'Colheita' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Produtividade (ton/ha)</Label>
                        <Input type="number" step="0.1" required onChange={(e) => setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, produtividade_ton_ha: e.target.value } })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Destino</Label>
                        <Select onValueChange={(v: string | null) => v && setNewAtividade({ ...newAtividade, dados: { ...newAtividade.dados, destino: v } })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Silo">Silo (Próprio)</SelectItem>
                            <SelectItem value="Venda">Venda Direta</SelectItem>
                            <SelectItem value="Grão">Armazém de Grãos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input value={newAtividade.observacoes} onChange={(e) => setNewAtividade({ ...newAtividade, observacoes: e.target.value })} placeholder="Detalhes adicionais..." />
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">Finalizar Registro</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddCicloOpen} onOpenChange={setIsAddCicloOpen}>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Sprout className="mr-2 h-4 w-4" />
                  Novo Ciclo Agrícola
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Novo Ciclo</DialogTitle>
                <DialogDescription>Inicie um novo ciclo de plantio em um talhão.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCiclo} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ciclo-talhao">Talhão</Label>
                  <Select onValueChange={(v: string | null) => v && setNewCiclo({ ...newCiclo, talhao_id: v })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o talhão" />
                    </SelectTrigger>
                    <SelectContent>
                      {talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciclo-cultura">Cultura</Label>
                  <Input 
                    id="ciclo-cultura" 
                    placeholder="Ex: Milho, Soja, Sorgo" 
                    required 
                    value={newCiclo.cultura}
                    onChange={(e) => setNewCiclo({ ...newCiclo, cultura: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ciclo-plantio">Data de Plantio</Label>
                    <Input 
                      id="ciclo-plantio" 
                      type="date" 
                      required 
                      value={newCiclo.data_plantio}
                      onChange={(e) => setNewCiclo({ ...newCiclo, data_plantio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciclo-colheita">Previsão de Colheita</Label>
                    <Input 
                      id="ciclo-colheita" 
                      type="date" 
                      value={newCiclo.data_colheita_prevista}
                      onChange={(e) => setNewCiclo({ ...newCiclo, data_colheita_prevista: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Registrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddTalhaoOpen} onOpenChange={setIsAddTalhaoOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Talhão
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Talhão</DialogTitle>
                <DialogDescription>Adicione uma nova área de produção.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTalhao} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="talhao-nome">Identificação do Talhão</Label>
                  <Input 
                    id="talhao-nome" 
                    placeholder="Ex: Talhão 05" 
                    required 
                    value={newTalhao.nome}
                    onChange={(e) => setNewTalhao({ ...newTalhao, nome: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="talhao-area">Área (ha)</Label>
                    <Input 
                      id="talhao-area" 
                      type="number" 
                      step="0.1" 
                      required 
                      value={newTalhao.area}
                      onChange={(e) => setNewTalhao({ ...newTalhao, area: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="talhao-solo">Tipo de Solo</Label>
                    <Input 
                      id="talhao-solo" 
                      placeholder="Ex: Argiloso" 
                      value={newTalhao.tipo_solo}
                      onChange={(e) => setNewTalhao({ ...newTalhao, tipo_solo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="talhao-loc">Localização</Label>
                  <Input 
                    id="talhao-loc" 
                    placeholder="Descrição ou coordenadas" 
                    value={newTalhao.localizacao}
                    onChange={(e) => setNewTalhao({ ...newTalhao, localizacao: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary dark:text-primary" />
              Custo por Período
            </CardTitle>
            <CardDescription>Calcule os custos vinculados a um talhão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar Talhão</Label>
              <Select onValueChange={(v: string | null) => v && setCostTalhaoId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" value={costStartDate} onChange={(e) => setCostStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" value={costEndDate} onChange={(e) => setCostEndDate(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCalculateCost} disabled={calculating}>
              {calculating ? 'Calculando...' : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Calcular Custo
                </>
              )}
            </Button>
            {calculatedCost !== null && (
              <div className="mt-4 p-4 bg-primary/10 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30 text-center">
                <div className="text-xs text-primary dark:text-primary font-medium uppercase tracking-wider">Custo Total no Período</div>
                <div className="text-2xl font-bold text-primary dark:text-primary">R$ {calculatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-full lg:col-span-2 grid gap-6 md:grid-cols-2">
          {talhoes.map((talhao) => (
            <Card key={talhao.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{talhao.nome}</CardTitle>
                <Map className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Área: {talhao.area} ha</span>
                    {getStatusBadge(talhao.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Solo: {talhao.tipo_solo || 'Não informado'}
                  </div>
                  {talhao.status === 'Plantado' && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary dark:text-primary">
                        <Sprout className="w-3 h-3" />
                        {ciclos.find(c => c.talhao_id === talhao.id && !c.data_colheita_real)?.cultura} em desenvolvimento
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {talhoes.length === 0 && !loading && (
            <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
              <Map className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-muted-foreground">Nenhum talhão cadastrado</CardTitle>
              <CardDescription>Clique em &quot;Novo Talhão&quot; para começar a gerenciar suas áreas de cultivo.</CardDescription>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Atividades de Campo</CardTitle>
            <CardDescription>Registro cronológico de todas as operações realizadas.</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <ClipboardList className="mr-2 h-4 w-4" />
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Talhão</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atividades.slice(0, 10).map((atv) => (
                <TableRow key={atv.id}>
                  <TableCell>{format(new Date(atv.data_atividade), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">
                    {talhoes.find(t => t.id === atv.talhao_id)?.nome}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {atv.tipo_atividade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {atv.custo_total ? `R$ ${atv.custo_total.toLocaleString('pt-BR')}` : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {atv.observacoes || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {atividades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhuma atividade registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ciclos Agrícolas e Produtividade</CardTitle>
          <CardDescription>Histórico de plantio e colheita por talhão.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Talhão</TableHead>
                <TableHead>Cultura</TableHead>
                <TableHead>Plantio</TableHead>
                <TableHead>Colheita Prevista</TableHead>
                <TableHead>Colheita Real</TableHead>
                <TableHead>Produtividade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ciclos.map((ciclo) => (
                <TableRow key={ciclo.id}>
                  <TableCell className="font-medium">
                    {talhoes.find(t => t.id === ciclo.talhao_id)?.nome || 'Talhão removido'}
                  </TableCell>
                  <TableCell>{ciclo.cultura}</TableCell>
                  <TableCell>{format(new Date(ciclo.data_plantio), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell>{ciclo.data_colheita_prevista ? format(new Date(ciclo.data_colheita_prevista), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</TableCell>
                  <TableCell>{ciclo.data_colheita_real ? format(new Date(ciclo.data_colheita_real), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</TableCell>
                  <TableCell className="font-bold">
                    {ciclo.produtividade ? `${ciclo.produtividade} ton/ha` : '-'}
                  </TableCell>
                  <TableCell>
                    {ciclo.data_colheita_real ? (
                      <Badge variant="outline" className="text-primary border-primary dark:text-primary dark:border-primary">Concluído</Badge>
                    ) : (
                      <Badge variant="outline" className="text-secondary border-secondary dark:text-secondary dark:border-secondary">Em curso</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {ciclos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum ciclo agrícola registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
