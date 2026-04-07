'use client';

import { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Plus, ArrowDownRight, ArrowUpRight, History, Database, Calendar, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Silo, MovimentacaoSilo, Insumo } from '@/lib/supabase';
import { getSilosByFazenda, createSilo, getCustoProducaoSilagem } from '@/lib/supabase/silos';
import { getInsumosByFazenda } from '@/lib/supabase/insumos';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SilosPage() {
  const [silos, setSilos] = useState<Silo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [custos, setCustos] = useState<Record<string, { custoPorTonelada: number } | null>>({});
  const [loading, setLoading] = useState(true);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);

  // Form states
  const [newSilo, setNewSilo] = useState({ 
    nome: '', 
    tipo: 'Bunker', 
    capacidade: '', 
    localizacao: '',
    materia_seca_percent: '',
    consumo_medio_diario_ton: '',
    insumo_lona_id: '',
    insumo_inoculante_id: ''
  });
  const [newMov, setNewMov] = useState({ silo_id: '', tipo: 'Entrada', quantidade: '', talhao_id: '', responsavel: '', observacao: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('fazenda_id')
        .eq('id', user.id)
        .single();

      if (profile?.fazenda_id) {
        const [silosData, insumosData] = await Promise.all([
          getSilosByFazenda(profile.fazenda_id),
          getInsumosByFazenda(profile.fazenda_id)
        ]);
        setSilos(silosData);
        setInsumos(insumosData);
        
        const { data: movs } = await supabase
          .from('movimentacoes_silo')
          .select('*')
          .in('silo_id', silosData.map(s => s.id))
          .order('data', { ascending: false });
        
        setMovimentacoes(movs || []);

        // Buscar custos de produção em paralelo
        const custosPromises = silosData.map(async (s) => {
          const custo = await getCustoProducaoSilagem(s.id);
          return { id: s.id, custo };
        });
        const custosResults = await Promise.all(custosPromises);
        const custosMap: Record<string, any> = {};
        custosResults.forEach(r => {
          custosMap[r.id] = r.custo;
        });
        setCustos(custosMap);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSilo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('fazenda_id')
        .eq('id', user.id)
        .single();

      if (profile?.fazenda_id) {
        await createSilo({
          nome: newSilo.nome,
          tipo: newSilo.tipo as any,
          capacidade: Number(newSilo.capacidade),
          localizacao: newSilo.localizacao,
          fazenda_id: profile.fazenda_id,
          materia_seca_percent: newSilo.materia_seca_percent ? Number(newSilo.materia_seca_percent) : null,
          consumo_medio_diario_ton: newSilo.consumo_medio_diario_ton ? Number(newSilo.consumo_medio_diario_ton) : null,
          insumo_lona_id: newSilo.insumo_lona_id || null,
          insumo_inoculante_id: newSilo.insumo_inoculante_id || null
        });
        toast.success('Silo cadastrado com sucesso!');
        setIsAddSiloOpen(false);
        fetchData();
        setNewSilo({ 
          nome: '', 
          tipo: 'Bunker', 
          capacidade: '', 
          localizacao: '',
          materia_seca_percent: '',
          consumo_medio_diario_ton: '',
          insumo_lona_id: '',
          insumo_inoculante_id: ''
        });
      }
    } catch (error) {
      toast.error('Erro ao cadastrar silo');
    }
  };

  const handleAddMov = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Movimentação registrada com sucesso!');
    setIsAddMovOpen(false);
  };

  const calculateOccupancy = (siloId: string, capacity: number) => {
    const siloMovs = movimentacoes.filter(m => m.silo_id === siloId);
    const total = siloMovs.reduce((acc: number, m) => m.tipo === 'Entrada' ? acc + m.quantidade : acc - m.quantidade, 0);
    return {
      total,
      percentage: Math.min(Math.round((total / capacity) * 100), 100)
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Silos</h2>
        <div className="flex gap-2">
          <Dialog open={isAddMovOpen} onOpenChange={setIsAddMovOpen}>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  Registrar Movimentação
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Movimentação</DialogTitle>
                <DialogDescription>Registre a entrada ou saída de silagem.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMov} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-silo">Silo</Label>
                    <Select onValueChange={(v: string | null) => v && setNewMov({ ...newMov, silo_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o silo" />
                      </SelectTrigger>
                      <SelectContent>
                        {silos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-tipo">Tipo</Label>
                    <Select defaultValue="Entrada" onValueChange={(v: string | null) => v && setNewMov({ ...newMov, tipo: v as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entrada">Entrada</SelectItem>
                        <SelectItem value="Saída">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-qty">Quantidade (ton)</Label>
                    <Input id="mov-qty" type="number" step="0.1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-resp">Responsável</Label>
                    <Input id="mov-resp" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mov-obs">Observações</Label>
                  <Input id="mov-obs" />
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSiloOpen} onOpenChange={setIsAddSiloOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Silo
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Silo</DialogTitle>
                <DialogDescription>Adicione uma nova estrutura de armazenamento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSilo} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="silo-nome">Nome do Silo</Label>
                  <Input id="silo-nome" placeholder="Ex: Silo Norte 01" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silo-tipo">Tipo de Estrutura</Label>
                    <Select defaultValue="Bunker">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bolsa">Bolsa</SelectItem>
                        <SelectItem value="Bunker">Bunker</SelectItem>
                        <SelectItem value="Convencional">Convencional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silo-cap">Capacidade (ton)</Label>
                    <Input id="silo-cap" type="number" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silo-ms">Matéria Seca (%)</Label>
                    <Input 
                      id="silo-ms" 
                      type="number" 
                      step="0.1" 
                      placeholder="Ex: 32.5" 
                      value={newSilo.materia_seca_percent}
                      onChange={(e) => setNewSilo({ ...newSilo, materia_seca_percent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silo-cons">Consumo Diário (ton)</Label>
                    <Input 
                      id="silo-cons" 
                      type="number" 
                      step="0.01" 
                      placeholder="Ex: 1.5" 
                      value={newSilo.consumo_medio_diario_ton}
                      onChange={(e) => setNewSilo({ ...newSilo, consumo_medio_diario_ton: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="silo-lona">Lona Utilizada</Label>
                    <Select onValueChange={(v: string | null) => v && setNewSilo({ ...newSilo, insumo_lona_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.filter(i => i.tipo === 'Outros').map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silo-inoc">Inoculante</Label>
                    <Select onValueChange={(v: string | null) => v && setNewSilo({ ...newSilo, insumo_inoculante_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.filter(i => i.tipo === 'Outros').map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="silo-loc">Localização</Label>
                  <Input 
                    id="silo-loc" 
                    placeholder="Descrição ou coordenadas" 
                    value={newSilo.localizacao}
                    onChange={(e) => setNewSilo({ ...newSilo, localizacao: e.target.value })}
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
        {silos.map((silo) => {
          const { total, percentage } = calculateOccupancy(silo.id, silo.capacidade);
          const diasRestantes = silo.consumo_medio_diario_ton ? Math.floor(total / silo.consumo_medio_diario_ton) : null;
          
          return (
            <Card key={silo.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{silo.nome}</CardTitle>
                <Database className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipo: {silo.tipo}</span>
                    <Badge variant={percentage > 90 ? "destructive" : percentage < 10 ? "outline" : "secondary"}>
                      {percentage}% ocupado
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>{total.toFixed(1)} ton</span>
                      <span>{silo.capacidade} ton</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  
                  {diasRestantes !== null && (
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <Calendar className="w-3 h-3" />
                        Estoque para:
                      </div>
                      <Badge 
                        variant={diasRestantes < 30 ? "destructive" : diasRestantes < 60 ? "secondary" : "outline"}
                        className={diasRestantes < 60 && diasRestantes >= 30 ? "bg-amber-500 text-white border-none" : ""}
                      >
                        {diasRestantes} dias
                      </Badge>
                    </div>
                  )}

                  <div className="pt-2 border-t grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div>MS: {silo.materia_seca_percent || '-'}%</div>
                    <div>Consumo: {silo.consumo_medio_diario_ton || '-'} t/dia</div>
                  </div>
                  
                  {custos[silo.id] && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs font-bold text-green-700">
                        <DollarSign className="w-3 h-3" />
                        Custo Produção:
                      </div>
                      <span className="text-xs font-black text-green-700">
                        R$ {custos[silo.id]?.custoPorTonelada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /ton
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground">
                    Localização: {silo.localizacao || 'Não informada'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {silos.length === 0 && !loading && (
          <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
            <Database className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <CardTitle className="text-muted-foreground">Nenhum silo cadastrado</CardTitle>
            <CardDescription>Clique em &quot;Novo Silo&quot; para começar a gerenciar seu armazenamento.</CardDescription>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>Últimos registros de entrada e saída de silagem.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{format(new Date(mov.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">
                    {silos.find(s => s.id === mov.silo_id)?.nome || 'Silo removido'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {mov.tipo === 'Entrada' ? (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={mov.tipo === 'Entrada' ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                        {mov.tipo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{mov.quantidade} ton</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {mov.observacao}
                  </TableCell>
                </TableRow>
              ))}
              {movimentacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma movimentação registrada.
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
