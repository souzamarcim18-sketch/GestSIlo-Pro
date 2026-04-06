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
import { Plus, Package, ArrowDownRight, ArrowUpRight, AlertTriangle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Insumo, MovimentacaoInsumo } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddInsumoOpen, setIsAddInsumoOpen] = useState(false);
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Data will be fetched from Supabase here
      setInsumos([]);
      setMovimentacoes([]);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Estoque de Insumos</h2>
        <div className="flex gap-2">
          <Dialog open={isAddMovOpen} onOpenChange={setIsAddMovOpen}>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <ArrowDownRight className="mr-2 h-4 w-4" />
                  Registrar Movimentação
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Movimentação de Insumo</DialogTitle>
                <DialogDescription>Registre a entrada ou saída de materiais.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); setIsAddMovOpen(false); toast.success('Movimentação registrada!'); }} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-insumo">Insumo</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-tipo">Tipo</Label>
                    <Select defaultValue="Saída">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entrada">Entrada (Compra)</SelectItem>
                        <SelectItem value="Saída">Saída (Uso)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-qty">Quantidade</Label>
                    <Input id="mov-qty" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-valor">Valor Unitário (R$)</Label>
                    <Input id="mov-valor" type="number" step="0.01" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov-dest">Destino / Fornecedor</Label>
                    <Input id="mov-dest" placeholder="Ex: Talhão 02 ou AgroSementes" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov-resp">Responsável</Label>
                    <Input id="mov-resp" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddInsumoOpen} onOpenChange={setIsAddInsumoOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Insumo
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Insumo</DialogTitle>
                <DialogDescription>Adicione um novo item ao catálogo de estoque.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); setIsAddInsumoOpen(false); toast.success('Insumo cadastrado!'); }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="insumo-nome">Nome do Insumo</Label>
                  <Input id="insumo-nome" placeholder="Ex: Adubo NPK" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insumo-tipo">Tipo</Label>
                    <Select defaultValue="Fertilizante">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fertilizante">Fertilizante</SelectItem>
                        <SelectItem value="Defensivo">Defensivo</SelectItem>
                        <SelectItem value="Semente">Semente</SelectItem>
                        <SelectItem value="Combustível">Combustível</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insumo-un">Unidade</Label>
                    <Input id="insumo-un" placeholder="Ex: kg, L, Saco" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insumo-min">Estoque Mínimo</Label>
                    <Input id="insumo-min" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insumo-atual">Estoque Inicial</Label>
                    <Input id="insumo-atual" type="number" defaultValue="0" />
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
        {insumos.map((insumo) => {
          const isLowStock = insumo.estoque_atual < insumo.estoque_minimo;
          const percentage = Math.min(Math.round((insumo.estoque_atual / (insumo.estoque_minimo * 2)) * 100), 100);
          return (
            <Card key={insumo.id} className={isLowStock ? "border-destructive/50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{insumo.nome}</CardTitle>
                <Package className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{insumo.tipo}</span>
                    {isLowStock && (
                      <Badge variant="destructive" className="animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Crítico
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={isLowStock ? "text-destructive font-bold" : "font-medium"}>
                        {insumo.estoque_atual} {insumo.unidade}
                      </span>
                      <span className="text-muted-foreground">Mín: {insumo.estoque_minimo} {insumo.unidade}</span>
                    </div>
                    <Progress value={percentage} className={isLowStock ? "bg-destructive/20 h-2" : "h-2"} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {insumos.length === 0 && !loading && (
          <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <CardTitle className="text-muted-foreground">Nenhum insumo cadastrado</CardTitle>
            <CardDescription>Clique em &quot;Novo Insumo&quot; para começar a gerenciar seu estoque.</CardDescription>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Movimentações</CardTitle>
            <CardDescription>Entradas e saídas de insumos do estoque.</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Destino / Origem</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{format(new Date(mov.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">
                    {insumos.find(i => i.id === mov.insumo_id)?.nome || 'Insumo removido'}
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
                  <TableCell className="font-bold">
                    {mov.quantidade} {insumos.find(i => i.id === mov.insumo_id)?.unidade}
                  </TableCell>
                  <TableCell>{mov.destino}</TableCell>
                  <TableCell>{mov.valor_unitario ? `R$ ${mov.valor_unitario.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                </TableRow>
              ))}
              {movimentacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
