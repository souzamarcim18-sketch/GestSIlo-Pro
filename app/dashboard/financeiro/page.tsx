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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { Plus, DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Financeiro } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const cashFlowData = [
  { name: 'Jan', receita: 0, despesa: 0 },
  { name: 'Fev', receita: 0, despesa: 0 },
  { name: 'Mar', receita: 0, despesa: 0 },
  { name: 'Abr', receita: 0, despesa: 0 },
  { name: 'Mai', receita: 0, despesa: 0 },
  { name: 'Jun', receita: 0, despesa: 0 },
];

export default function FinanceiroPage() {
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Data will be fetched from Supabase here
      setFinanceiro([]);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const totalReceita = financeiro.filter(f => f.tipo === 'Receita').reduce((acc: number, f: Financeiro) => acc + f.valor, 0);
  const totalDespesa = financeiro.filter(f => f.tipo === 'Despesa').reduce((acc: number, f: Financeiro) => acc + f.valor, 0);
  const saldo = totalReceita - totalDespesa;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestão Financeira</h2>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Relatório Financeiro
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Relatório</DialogTitle>
                <DialogDescription>Selecione o período e categorias para exportar.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rel-inicio">Início</Label>
                    <Input id="rel-inicio" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rel-fim">Fim</Label>
                    <Input id="rel-fim" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rel-cat">Categoria</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="insumos">Insumos</SelectItem>
                      <SelectItem value="venda">Venda Produção</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => toast.success('Relatório gerado com sucesso!')}>Gerar PDF</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
                <DialogDescription>Registre uma nova receita ou despesa.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); toast.success('Lançamento realizado!'); }} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fin-tipo">Tipo</Label>
                    <Select defaultValue="Despesa">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Receita">Receita</SelectItem>
                        <SelectItem value="Despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fin-valor">Valor (R$)</Label>
                    <Input id="fin-valor" type="number" step="0.01" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin-desc">Descrição</Label>
                  <Input id="fin-desc" placeholder="Ex: Venda de milho" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fin-cat">Categoria</Label>
                    <Input id="fin-cat" placeholder="Ex: Insumos" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fin-data">Data</Label>
                    <Input id="fin-data" type="date" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fin-ref-tipo">Vincular a</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Silo">Silo</SelectItem>
                        <SelectItem value="Talhão">Talhão</SelectItem>
                        <SelectItem value="Máquina">Máquina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fin-pag">Forma de Pagamento</Label>
                    <Input id="fin-pag" placeholder="Ex: Transferência" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Lançar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
              R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Resultado operacional
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Mensal</CardTitle>
          <CardDescription>Comparativo de receitas e despesas nos últimos 6 meses.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorReceita)" name="Receita" />
                <Area type="monotone" dataKey="despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorDespesa)" name="Despesa" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Recentes</CardTitle>
          <CardDescription>Últimas movimentações financeiras registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma Pag.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financeiro.map((fin) => (
                <TableRow key={fin.id}>
                  <TableCell>{format(new Date(fin.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{fin.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{fin.categoria}</Badge>
                  </TableCell>
                  <TableCell>
                    {fin.referencia_tipo ? (
                      <span className="text-xs text-muted-foreground">
                        {fin.referencia_tipo}: {fin.referencia_id?.slice(0, 5)}...
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className={`font-bold ${fin.tipo === 'Receita' ? 'text-green-600' : 'text-destructive'}`}>
                    {fin.tipo === 'Receita' ? '+' : '-'} R$ {fin.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{fin.forma_pagamento}</TableCell>
                  <TableCell>
                    <Badge variant={fin.tipo === 'Receita' ? "default" : "secondary"}>
                      {fin.tipo}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {financeiro.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum lançamento financeiro encontrado.
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
