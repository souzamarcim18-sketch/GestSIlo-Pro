'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  BarChart3,
  Database,
  Map,
  Truck,
  DollarSign,
  Table as TableIcon
} from 'lucide-react';
import { toast } from 'sonner';

const reportTypes = [
  {
    title: 'Produtividade por Talhão',
    description: 'Relatório detalhado de colheita e produtividade média por hectare.',
    icon: Map,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Movimentação de Silos',
    description: 'Histórico completo de entradas e saídas de silagem por período.',
    icon: Database,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    title: 'Consumo de Insumos',
    description: 'Relatório de aplicação de insumos por talhão e cultura.',
    icon: Package,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    title: 'Custo Operacional (Frota)',
    description: 'Análise de gastos com manutenção e combustível por máquina.',
    icon: Truck,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    title: 'Financeiro Geral',
    description: 'Demonstrativo de resultados, fluxo de caixa e balanço do período.',
    icon: DollarSign,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    title: 'Inventário de Estoque',
    description: 'Posição atual do estoque de insumos e grãos.',
    icon: TableIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
];

import { Package } from 'lucide-react';

export default function RelatoriosPage() {
  const handleExport = (type: string, format: 'PDF' | 'Excel') => {
    toast.success(`Exportando ${type} em ${format}...`);
    // In a real app, this would trigger a download from the backend
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h2>
        <Button variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          Configurar Dashboards
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className={`p-3 rounded-xl ${report.bg}`}>
                <report.icon className={`h-6 w-6 ${report.color}`} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {report.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleExport(report.title, 'PDF')}
              >
                <FileText className="mr-2 h-3 w-3" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleExport(report.title, 'Excel')}
              >
                <Download className="mr-2 h-3 w-3" />
                Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Relatórios Customizados</CardTitle>
          <CardDescription>
            Não encontrou o que precisava? Crie um relatório personalizado cruzando dados de diferentes módulos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-primary hover:bg-primary/90">
            Criar Relatório Personalizado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
