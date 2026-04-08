'use client';

// ✅ Todos os imports no topo, antes de qualquer uso
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
  Table as TableIcon,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Dados estáticos
// ---------------------------------------------------------------------------
const reportTypes = [
  {
    title: 'Produtividade por Talhão',
    description: 'Relatório detalhado de colheita e produtividade média por hectare.',
    icon: Map,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
  },
  {
    title: 'Movimentação de Silos',
    description: 'Histórico completo de entradas e saídas de silagem por período.',
    icon: Database,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    title: 'Consumo de Insumos',
    description: 'Relatório de aplicação de insumos por talhão e cultura.',
    icon: Package,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    title: 'Custo Operacional (Frota)',
    description: 'Análise de gastos com manutenção e combustível por máquina.',
    icon: Truck,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    title: 'Financeiro Geral',
    description: 'Demonstrativo de resultados, fluxo de caixa e balanço do período.',
    icon: DollarSign,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950',
  },
  {
    title: 'Inventário de Estoque',
    description: 'Posição atual do estoque de insumos e grãos.',
    icon: TableIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950',
  },
] as const;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function RelatoriosPage() {
  const handleExport = (type: string, format: 'PDF' | 'Excel') => {
    toast.success(`Exportando ${type} em ${format}...`);
    // Em produção: disparar download via backend
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {/* ✅ h1 real da página */}
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h1>
        <Button
          variant="outline"
          onClick={() => toast.info('Configuração de dashboards em breve.')}
          aria-label="Configurar dashboards personalizados"
        >
          <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
          Configurar Dashboards
        </Button>
      </div>

      {/* ── Grid de relatórios ─────────────────────────────────────────── */}
      <section aria-labelledby="relatorios-heading">
        <h2 id="relatorios-heading" className="sr-only">
          Tipos de relatório disponíveis
        </h2>

        {/*
          role="list" restaura semântica de lista que CSS grid/flexbox
          remove em alguns leitores de tela (VoiceOver/Safari)
        */}
        <ul
          role="list"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0"
        >
          {reportTypes.map((report) => (
            <li key={report.title} role="listitem">
              <Card
                className="hover:shadow-md transition-shadow h-full"
                aria-label={`Relatório: ${report.title}`}
              >
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  {/* Ícone puramente decorativo */}
                  <div className={`p-3 rounded-xl ${report.bg} shrink-0`} aria-hidden="true">
                    <report.icon className={`h-6 w-6 ${report.color}`} aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    {/* ✅ h3 dentro de section com h2 via sr-only */}
                    <CardTitle as="h3" className="text-lg">
                      {report.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {report.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex gap-2">
                  {/*
                    ✅ aria-label inclui o nome do relatório:
                    "Exportar Produtividade por Talhão em PDF"
                    — resolve button-name SERIOUS
                  */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExport(report.title, 'PDF')}
                    aria-label={`Exportar ${report.title} em PDF`}
                  >
                    <FileText className="mr-2 h-3 w-3" aria-hidden="true" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExport(report.title, 'Excel')}
                    aria-label={`Exportar ${report.title} em Excel`}
                  >
                    <Download className="mr-2 h-3 w-3" aria-hidden="true" />
                    Excel
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Card: Relatórios Customizados ──────────────────────────────── */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary" as="h2">
            Relatórios Customizados
          </CardTitle>
          <CardDescription>
            Não encontrou o que precisava? Crie um relatório personalizado
            cruzando dados de diferentes módulos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => toast.info('Criação de relatórios personalizados em breve.')}
            aria-label="Criar relatório personalizado — funcionalidade em breve"
          >
            Criar Relatório Personalizado
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
