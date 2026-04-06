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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Truck, Settings, Fuel, History, AlertTriangle, Clock, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Maquina, UsoMaquina, Manutencao, Abastecimento } from '@/lib/supabase';
import { format, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FrotaPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [usos, setUsos] = useState<UsoMaquina[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Data will be fetched from Supabase here
      setMaquinas([]);
      setUsos([]);
      setManutencoes([]);
      setAbastecimentos([]);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getMaintenanceStatus = (maquinaId: string) => {
    const maquinaManutencoes = manutencoes.filter(m => m.maquina_id === maquinaId);
    if (maquinaManutencoes.length === 0) return null;
    
    const last = maquinaManutencoes[maquinaManutencoes.length - 1];
    if (!last.proxima_manutencao) return null;

    const nextDate = new Date(last.proxima_manutencao);
    const today = new Date();
    
    if (isBefore(nextDate, today)) {
      return <Badge variant="destructive" className="animate-pulse">Manutenção Vencida</Badge>;
    }
    
    if (isBefore(nextDate, addDays(today, 7))) {
      return <Badge variant="secondary" className="bg-amber-500 text-white">Próxima Manutenção</Badge>;
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Frota e Máquinas</h2>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Registrar Manutenção
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Manutenção</DialogTitle>
                <DialogDescription>Registre serviços preventivos ou corretivos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); toast.success('Manutenção registrada!'); }} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="man-maq">Máquina</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="man-tipo">Tipo</Label>
                    <Select defaultValue="Preventiva">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="man-desc">Descrição do Serviço</Label>
                  <Input id="man-desc" placeholder="Ex: Troca de óleo, reparo hidráulico" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="man-custo">Custo (R$)</Label>
                    <Input id="man-custo" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="man-prox">Próxima Manutenção</Label>
                    <Input id="man-prox" type="date" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Máquina
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Máquina</DialogTitle>
                <DialogDescription>Adicione um novo equipamento à frota.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); toast.success('Máquina cadastrada!'); }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="maq-nome">Nome / Identificação</Label>
                  <Input id="maq-nome" placeholder="Ex: Trator JD 01" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-tipo">Tipo</Label>
                    <Select defaultValue="Trator">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Trator">Trator</SelectItem>
                        <SelectItem value="Colheitadeira">Colheitadeira</SelectItem>
                        <SelectItem value="Pulverizador">Pulverizador</SelectItem>
                        <SelectItem value="Caminhão">Caminhão</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-marca">Marca</Label>
                    <Input id="maq-marca" placeholder="Ex: John Deere" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-modelo">Modelo</Label>
                    <Input id="maq-modelo" placeholder="Ex: 6125J" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-ano">Ano</Label>
                    <Input id="maq-ano" type="number" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {maquinas.map((maquina) => (
          <Card key={maquina.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold">{maquina.nome}</CardTitle>
              <Truck className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{maquina.tipo} • {maquina.identificacao}</span>
                  {getMaintenanceStatus(maquina.id)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {maquina.marca} {maquina.modelo} ({maquina.ano})
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                    <Clock className="w-3 h-3" />
                    {usos.filter(u => u.maquina_id === maquina.id).reduce((acc, u) => acc + (u.horas || 0), 0)}h
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Gauge className="w-3 h-3" />
                    {usos.filter(u => u.maquina_id === maquina.id).reduce((acc, u) => acc + (u.km || 0), 0)}km
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {maquinas.length === 0 && !loading && (
          <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
            <Truck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <CardTitle className="text-muted-foreground">Nenhuma máquina cadastrada</CardTitle>
            <CardDescription>Clique em &quot;Nova Máquina&quot; para começar a gerenciar sua frota.</CardDescription>
          </Card>
        )}
      </div>

      <Tabs defaultValue="uso" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="uso">Uso Diário</TabsTrigger>
          <TabsTrigger value="manutencao">Manutenções</TabsTrigger>
          <TabsTrigger value="abastecimento">Abastecimentos</TabsTrigger>
        </TabsList>
        <TabsContent value="uso" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Uso</CardTitle>
                <CardDescription>Registros de atividades e horas trabalhadas.</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Registrar Uso
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usos.map((uso) => (
                    <TableRow key={uso.id}>
                      <TableCell>{format(new Date(uso.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find(m => m.id === uso.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>{uso.operador}</TableCell>
                      <TableCell>{uso.atividade}</TableCell>
                      <TableCell>{uso.horas ? `${uso.horas}h` : '-'}</TableCell>
                      <TableCell>{uso.km ? `${uso.km}km` : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {usos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Nenhum registro de uso encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manutencao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Manutenções</CardTitle>
              <CardDescription>Serviços realizados e próximos agendamentos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Próxima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manutencoes.map((man) => (
                    <TableRow key={man.id}>
                      <TableCell>{format(new Date(man.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find(m => m.id === man.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={man.tipo === 'Preventiva' ? "outline" : "secondary"}>
                          {man.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{man.descricao}</TableCell>
                      <TableCell className="font-bold">R$ {man.custo?.toFixed(2)}</TableCell>
                      <TableCell>
                        {man.proxima_manutencao ? format(new Date(man.proxima_manutencao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="abastecimento" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Abastecimentos</CardTitle>
                <CardDescription>Consumo de combustível por máquina.</CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <Fuel className="mr-2 h-4 w-4" />
                Novo Abastecimento
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Hodômetro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abastecimentos.map((abs) => (
                    <TableRow key={abs.id}>
                      <TableCell>{format(new Date(abs.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find(m => m.id === abs.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>{abs.combustivel}</TableCell>
                      <TableCell className="font-bold">{abs.litros} L</TableCell>
                      <TableCell>R$ {abs.valor?.toFixed(2)}</TableCell>
                      <TableCell>{abs.hodometro}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
