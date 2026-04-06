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
import { Plus, ArrowDownRight, ArrowUpRight, History, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Silo, MovimentacaoSilo } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SilosPage() {
  const [silos, setSilos] = useState<Silo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);

  // Form states
  const [newSilo, setNewSilo] = useState({ nome: '', tipo: 'Bunker', capacidade: '', localizacao: '' });
  const [newMov, setNewMov] = useState({ silo_id: '', tipo: 'Entrada', quantidade: '', talhao_id: '', responsavel: '', observacao: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mocking data for now as we don't have a real Supabase instance configured
      const mockSilos: Silo[] = [
        { id: '1', nome: 'Silo A', tipo: 'Bunker', capacidade: 500, localizacao: 'Setor Norte', fazenda_id: '1' },
        { id: '2', nome: 'Silo B', tipo: 'Convencional', capacidade: 1000, localizacao: 'Setor Sul', fazenda_id: '1' },
        { id: '3', nome: 'Silo C', tipo: 'Bolsa', capacidade: 200, localizacao: 'Setor Leste', fazenda_id: '1' },
      ];
      setSilos(mockSilos);

      const mockMovs: MovimentacaoSilo[] = [
        { id: '1', silo_id: '1', tipo: 'Entrada', quantidade: 45, data: '2026-04-06', talhao_id: '1', responsavel: 'João Silva', observacao: 'Milho colhido' },
        { id: '2', silo_id: '1', tipo: 'Saída', quantidade: 12, data: '2026-04-05', talhao_id: null, responsavel: 'Maria Santos', observacao: 'Trato animais' },
      ];
      setMovimentacoes(mockMovs);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSilo = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Silo cadastrado com sucesso!');
    setIsAddSiloOpen(false);
  };

  const handleAddMov = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Movimentação registrada com sucesso!');
    setIsAddMovOpen(false);
  };

  const calculateOccupancy = (siloId: string, capacity: number) => {
    const siloMovs = movimentacoes.filter(m => m.silo_id === siloId);
    const total = siloMovs.reduce((acc, m) => m.tipo === 'Entrada' ? acc + m.quantidade : acc - m.quantidade, 0);
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
                    <Select onValueChange={(v) => setNewMov({ ...newMov, silo_id: v as string })}>
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
                    <Select defaultValue="Entrada" onValueChange={(v) => setNewMov({ ...newMov, tipo: v as any })}>
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
                <div className="space-y-2">
                  <Label htmlFor="silo-loc">Localização</Label>
                  <Input id="silo-loc" placeholder="Descrição ou coordenadas" />
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
                      <span>{total} ton</span>
                      <span>{silo.capacidade} ton</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Localização: {silo.localizacao || 'Não informada'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
