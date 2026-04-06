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
import { Plus, Map, Sprout, Tractor, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Talhao, CicloAgricola } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TalhoesPage() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [ciclos, setCiclos] = useState<CicloAgricola[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTalhaoOpen, setIsAddTalhaoOpen] = useState(false);
  const [isAddCicloOpen, setIsAddCicloOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Data will be fetched from Supabase here
      setTalhoes([]);
      setCiclos([]);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Plantado': return <Badge className="bg-green-500 hover:bg-green-600"><Sprout className="w-3 h-3 mr-1" /> Plantado</Badge>;
      case 'Em preparo': return <Badge className="bg-amber-500 hover:bg-amber-600"><Tractor className="w-3 h-3 mr-1" /> Em preparo</Badge>;
      case 'Colhido': return <Badge className="bg-blue-500 hover:bg-blue-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Colhido</Badge>;
      case 'Em pousio': return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Em pousio</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Talhões</h2>
        <div className="flex gap-2">
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
              <form onSubmit={(e) => { e.preventDefault(); setIsAddCicloOpen(false); toast.success('Ciclo registrado!'); }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ciclo-talhao">Talhão</Label>
                  <Select required>
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
                  <Input id="ciclo-cultura" placeholder="Ex: Milho, Soja, Sorgo" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ciclo-plantio">Data de Plantio</Label>
                    <Input id="ciclo-plantio" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciclo-colheita">Previsão de Colheita</Label>
                    <Input id="ciclo-colheita" type="date" />
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
              <form onSubmit={(e) => { e.preventDefault(); setIsAddTalhaoOpen(false); toast.success('Talhão cadastrado!'); }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="talhao-nome">Identificação do Talhão</Label>
                  <Input id="talhao-nome" placeholder="Ex: Talhão 05" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="talhao-area">Área (ha)</Label>
                    <Input id="talhao-area" type="number" step="0.1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="talhao-solo">Tipo de Solo</Label>
                    <Input id="talhao-solo" placeholder="Ex: Argiloso" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="talhao-loc">Localização</Label>
                  <Input id="talhao-loc" placeholder="Descrição ou coordenadas" />
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
                    <div className="flex items-center gap-2 text-xs font-medium text-green-600">
                      <Sprout className="w-3 h-3" />
                      {ciclos.find(c => c.talhao_id === talhao.id)?.cultura} em desenvolvimento
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
                      <Badge variant="outline" className="text-green-600 border-green-600">Concluído</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">Em curso</Badge>
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
