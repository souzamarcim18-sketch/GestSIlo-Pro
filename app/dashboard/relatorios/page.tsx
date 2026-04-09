'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  BarChart3,
  Database,
  Map,
  Truck,
  DollarSign,
  Table as TableIcon,
  Package,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getLancamentosByFazenda } from '@/lib/supabase/financeiro';
import { getSilosByFazenda } from '@/lib/supabase/silos';
import { getInsumosByFazenda } from '@/lib/supabase/insumos';
import { getTalhoesByFazenda } from '@/lib/supabase/talhoes';
import { getMaquinasByFazenda } from '@/lib/supabase/maquinas';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function downloadXlsx(workbook: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Report generators
// ---------------------------------------------------------------------------
async function exportFinanceiro(fazendaId: string) {
  const lancamentos = await getLancamentosByFazenda(fazendaId);
  const rows = lancamentos.map((l) => ({
    Data: l.data,
    Tipo: l.tipo,
    Categoria: l.categoria,
    Descrição: l.descricao,
    'Valor (R$)': l.valor,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
  downloadXlsx(wb, `financeiro_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportSilos(fazendaId: string) {
  const silos = await getSilosByFazenda(fazendaId);

  // movimentações de cada silo
  const { data: movs } = await supabase
    .from('movimentacoes_silo')
    .select('*')
    .in('silo_id', silos.map((s) => s.id))
    .order('data', { ascending: false });

  const wbSilos = XLSX.utils.json_to_sheet(
    silos.map((s) => ({
      Nome: s.nome,
      Tipo: s.tipo,
      'Capacidade (t)': s.capacidade,
      Localização: s.localizacao ?? '',
      'MS (%)': s.materia_seca_percent ?? '',
      'Consumo Médio (t/dia)': s.consumo_medio_diario_ton ?? '',
    }))
  );

  const wbMovs = XLSX.utils.json_to_sheet(
    (movs ?? []).map((m: Record<string, unknown>) => ({
      'Silo ID': m.silo_id,
      Data: m.data,
      Tipo: m.tipo,
      'Quantidade (t)': m.quantidade,
      Responsável: m.responsavel ?? '',
      Observação: m.observacao ?? '',
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wbSilos, 'Silos');
  XLSX.utils.book_append_sheet(wb, wbMovs, 'Movimentações');
  downloadXlsx(wb, `silos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportInsumos(fazendaId: string) {
  const insumos = await getInsumosByFazenda(fazendaId);
  const rows = insumos.map((i) => ({
    Nome: i.nome,
    Tipo: i.tipo,
    Unidade: i.unidade,
    'Estoque Atual': i.estoque_atual,
    'Estoque Mínimo': i.estoque_minimo,
    'N (%)': i.teor_n_percent ?? '',
    'P (%)': i.teor_p_percent ?? '',
    'K (%)': i.teor_k_percent ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
  downloadXlsx(wb, `insumos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportTalhoes(fazendaId: string) {
  const talhoes = await getTalhoesByFazenda(fazendaId);
  const rows = talhoes.map((t) => ({
    Nome: t.nome,
    'Área (ha)': t.area,
    'Tipo de Solo': t.tipo_solo ?? '',
    Localização: t.localizacao ?? '',
    Status: t.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Talhões');
  downloadXlsx(wb, `talhoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportFrota(fazendaId: string) {
  const maquinas = await getMaquinasByFazenda(fazendaId);
  const rows = maquinas.map((m) => ({
    Nome: m.nome,
    Tipo: m.tipo,
    Marca: m.marca ?? '',
    Modelo: m.modelo ?? '',
    Ano: m.ano ?? '',
    Identificação: m.identificacao ?? '',
    'Consumo Médio (L/h)': m.consumo_medio_lh ?? '',
    'Valor de Aquisição (R$)': m.valor_aquisicao ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Frota');
  downloadXlsx(wb, `frota_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------------------------------------------------------------------------
// Map report key → export function
// ---------------------------------------------------------------------------
type ReportKey =
  | 'talhoes'
  | 'silos'
  | 'insumos'
  | 'frota'
  | 'financeiro'
  | 'estoque';

const exportFunctions: Record<
  ReportKey,
  (fazendaId: string) => Promise<void>
> = {
  talhoes: exportTalhoes,
  silos: exportSilos,
  insumos: exportInsumos,
  frota: exportFrota,
  financeiro: exportFinanceiro,
  estoque: exportInsumos, // inventário de estoque usa dados de insumos
};

// ---------------------------------------------------------------------------
// Report definitions
// ---------------------------------------------------------------------------
const reportTypes: {
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    key: 'talhoes',
    title: 'Produtividade por Talhão',
    description: 'Relatório detalhado de talhões, área e cultura atual.',
    icon: Map,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
  },
  {
    key: 'silos',
    title: 'Movimentação de Silos',
    description: 'Histórico completo de entradas e saídas de silagem por período.',
    icon: Database,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    key: 'insumos',
    title: 'Consumo de Insumos',
    description: 'Relatório de aplicação de insumos por talhão e cultura.',
    icon: Package,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    key: 'frota',
    title: 'Custo Operacional (Frota)',
    description: 'Análise de gastos com manutenção e combustível por máquina.',
    icon: Truck,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    key: 'financeiro',
    title: 'Financeiro Geral',
    description: 'Demonstrativo de resultados, fluxo de caixa e balanço do período.',
    icon: DollarSign,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950',
  },
  {
    key: 'estoque',
    title: 'Inventário de Estoque',
    description: 'Posição atual do estoque de insumos e grãos.',
    icon: TableIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RelatoriosPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [loadingKey, setLoadingKey] = useState<ReportKey | null>(null);

  const handleExport = async (key: ReportKey, title: string) => {
    if (!fazendaId) {
      toast.error('Fazenda não identificada. Tente novamente.');
      return;
    }
    setLoadingKey(key);
    try {
      await exportFunctions[key](fazendaId);
      toast.success(`${title} exportado com sucesso!`);
    } catch (err: unknown) {
      console.error('Export error:', err);
      toast.error('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h1>
        <Button
          variant="outline"
          aria-label="Configurar dashboards personalizados"
          disabled
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

        <ul
          role="list"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0"
        >
          {reportTypes.map((report) => {
            const isLoading = loadingKey === report.key;
            return (
              <li key={report.key} role="listitem">
                <Card
                  className="hover:shadow-md transition-shadow h-full"
                  aria-label={`Relatório: ${report.title}`}
                >
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className={`p-3 rounded-xl ${report.bg} shrink-0`} aria-hidden="true">
                      <report.icon className={`h-6 w-6 ${report.color}`} aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {report.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isLoading || authLoading || !fazendaId}
                      onClick={() => handleExport(report.key, report.title)}
                      aria-label={`Exportar ${report.title} em Excel`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-3 w-3" aria-hidden="true" />
                          Exportar Excel
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

    </div>
  );
}
