'use client';

import { useState, useMemo } from 'react';
import {
  Database, Map, Truck, DollarSign, Package, PackageOpen,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { q } from '@/lib/supabase/queries-audit';
import { gerarExcel } from '@/lib/relatorios/excel-builder';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';
import { listMovimentacoesInsumoPorPeriodo } from '@/lib/supabase/relatorios/insumos';
import { getRelatorioFrota } from '@/lib/supabase/relatorios/frota';
import { RelatorioCard } from '@/components/relatorios/RelatorioCard';
import { PeriodoFilter } from '@/components/ui/PeriodoFilter';

const hoje = new Date();

export function RelatoriosClient({ fazendaId, fazendaNome }: { fazendaId: string; fazendaNome: string }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Períodos por relatório
  const [periodoMovInsumos, setPeriodoMovInsumos] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoFrota, setPeriodoFrota] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoFinanceiro, setPeriodoFinanceiro] = useState({ from: subDays(hoje, 365), to: hoje });

  const metaBase = useMemo(() => ({
    fazendaNome,
    geradoEm: new Date(),
    nomeRelatorio: '',
  }), [fazendaNome]);

  const handleExport = async (key: string, fn: () => Promise<void>) => {
    if (!fazendaId) {
      toast.error('Fazenda não identificada. Tente novamente.');
      return;
    }
    setLoadingKey(key);
    try {
      await fn();
    } catch (err: unknown) {
      console.error('Export error:', err);
      toast.error('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoadingKey(null);
    }
  };

  // ─── Silos ───────────────────────────────────────────────────────────────────
  const exportSilos = () => handleExport('silos', async () => {
    const silos = await q.silos.list();
    const movs = await q.movimentacoesSilo.listBySilos(silos.map((s) => s.id));
    const siloMap: Record<string, string> = {};
    silos.forEach((s) => { siloMap[s.id] = s.nome; });

    gerarExcel({
      fileName: `silos_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Movimentação de Silos' },
      sheets: [
        {
          nome: 'Silos',
          colunas: [
            { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
            { key: 'tipo', label: 'Tipo', tipo: 'text' },
            { key: 'volume', label: 'Volume Ensilado (t)', tipo: 'number' },
            { key: 'ms', label: 'MS (%)', tipo: 'number' },
          ],
          linhas: silos.map((s) => ({
            nome: s.nome, tipo: s.tipo,
            volume: s.volume_ensilado_ton_mv ?? null, ms: s.materia_seca_percent ?? null,
          })),
        },
        {
          nome: 'Movimentações',
          colunas: [
            { key: 'silo', label: 'Silo', tipo: 'text', largura: 25 },
            { key: 'data', label: 'Data', tipo: 'date' },
            { key: 'tipo', label: 'Tipo', tipo: 'text' },
            { key: 'quantidade', label: 'Quantidade (t)', tipo: 'number' },
            { key: 'responsavel', label: 'Responsável', tipo: 'text', largura: 25 },
            { key: 'observacao', label: 'Observação', tipo: 'text', largura: 30 },
          ],
          linhas: movs.map((m) => ({
            silo: siloMap[m.silo_id] ?? m.silo_id,
            data: m.data, tipo: m.tipo,
            quantidade: m.quantidade,
            responsavel: m.responsavel ?? '',
            observacao: m.observacao ?? '',
          })),
        },
      ],
    });
    toast.success('Relatório de Silos exportado com sucesso!');
  });

  // ─── Talhões ─────────────────────────────────────────────────────────────────
  const exportTalhoes = () => handleExport('talhoes', async () => {
    const talhoes = await q.talhoes.list();
    gerarExcel({
      fileName: `talhoes_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Produtividade por Talhão' },
      sheets: [{
        nome: 'Talhões',
        colunas: [
          { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
          { key: 'area', label: 'Área (ha)', tipo: 'number' },
          { key: 'tipo_solo', label: 'Tipo de Solo', tipo: 'text', largura: 20 },
          { key: 'status', label: 'Status', tipo: 'text' },
        ],
        linhas: talhoes.map((t) => ({
          nome: t.nome, area: t.area_ha, tipo_solo: t.tipo_solo ?? '', status: t.status,
        })),
      }],
    });
    toast.success('Relatório de Talhões exportado com sucesso!');
  });

  // ─── Posição de Estoque (Insumos) ─────────────────────────────────────────────
  const exportInsumos = () => handleExport('insumos', async () => {
    const insumos = await q.insumos.list();
    gerarExcel({
      fileName: `insumos_estoque_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Posição de Estoque (Insumos)' },
      sheets: [{
        nome: 'Estoque de Insumos',
        colunas: [
          { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
          { key: 'unidade', label: 'Unidade', tipo: 'text' },
          { key: 'estoque_atual', label: 'Estoque Atual', tipo: 'number' },
          { key: 'estoque_minimo', label: 'Estoque Mínimo', tipo: 'number' },
          { key: 'n', label: 'N (%)', tipo: 'number' },
          { key: 'p', label: 'P (%)', tipo: 'number' },
          { key: 'k', label: 'K (%)', tipo: 'number' },
        ],
        linhas: insumos.map((i) => ({
          nome: i.nome, unidade: i.unidade,
          estoque_atual: i.estoque_atual, estoque_minimo: i.estoque_minimo,
          n: i.teor_n_percent ?? null, p: i.teor_p_percent ?? null, k: i.teor_k_percent ?? null,
        })),
      }],
    });
    toast.success('Posição de Estoque exportada com sucesso!');
  });

  // ─── Movimentação de Insumos ─────────────────────────────────────────────────
  const exportMovInsumos = () => handleExport('mov_insumos', async () => {
    const rows = await listMovimentacoesInsumoPorPeriodo(fazendaId, periodoMovInsumos.from, periodoMovInsumos.to);
    gerarExcel({
      fileName: `insumos_movimentacoes_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Movimentação de Insumos', periodo: periodoMovInsumos },
      sheets: [{
        nome: 'Movimentações',
        colunas: [
          { key: 'data_movimentacao', label: 'Data', tipo: 'date' },
          { key: 'insumo_nome', label: 'Insumo', tipo: 'text', largura: 25 },
          { key: 'tipo', label: 'Tipo', tipo: 'text' },
          { key: 'quantidade', label: 'Quantidade', tipo: 'number' },
          { key: 'unidade_medida', label: 'Unidade', tipo: 'text' },
          { key: 'valor_unitario', label: 'Valor Unit.', tipo: 'BRL' },
          { key: 'valor_total', label: 'Valor Total', tipo: 'BRL' },
          { key: 'origem', label: 'Origem', tipo: 'text' },
          { key: 'responsavel', label: 'Responsável', tipo: 'text', largura: 25 },
          { key: 'observacoes', label: 'Observações', tipo: 'text', largura: 30 },
        ],
        linhas: rows as unknown as Record<string, unknown>[],
      }],
    });
    toast.success('Movimentações de Insumos exportadas com sucesso!');
  });

  // ─── Custo Operacional da Frota ───────────────────────────────────────────────
  const exportFrota = () => handleExport('frota', async () => {
    const result = await getRelatorioFrota(fazendaId, periodoFrota.from, periodoFrota.to);
    gerarExcel({
      fileName: `frota_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Custo Operacional da Frota', periodo: periodoFrota },
      sheets: [
        {
          nome: 'Máquinas',
          colunas: [
            { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
            { key: 'tipo', label: 'Tipo', tipo: 'text' },
            { key: 'marca', label: 'Marca', tipo: 'text' },
            { key: 'modelo', label: 'Modelo', tipo: 'text' },
            { key: 'ano', label: 'Ano', tipo: 'number' },
            { key: 'identificacao', label: 'Identificação', tipo: 'text' },
            { key: 'consumo_medio_litros_hora', label: 'Consumo (L/h)', tipo: 'number' },
            { key: 'valor_aquisicao', label: 'Valor Aquisição', tipo: 'BRL' },
            { key: 'status', label: 'Status', tipo: 'text' },
          ],
          linhas: result.maquinas as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Manutenções',
          colunas: [
            { key: 'maquina_nome', label: 'Máquina', tipo: 'text', largura: 25 },
            { key: 'tipo', label: 'Tipo', tipo: 'text' },
            { key: 'descricao', label: 'Descrição', tipo: 'text', largura: 30 },
            { key: 'data_prevista', label: 'Data Prevista', tipo: 'date' },
            { key: 'data_realizada', label: 'Data Realizada', tipo: 'date' },
            { key: 'custo', label: 'Custo', tipo: 'BRL' },
            { key: 'status', label: 'Status', tipo: 'text' },
            { key: 'responsavel', label: 'Responsável', tipo: 'text', largura: 25 },
          ],
          linhas: result.manutencoes as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Abastecimentos',
          colunas: [
            { key: 'maquina_nome', label: 'Máquina', tipo: 'text', largura: 25 },
            { key: 'data', label: 'Data', tipo: 'date' },
            { key: 'litros', label: 'Litros', tipo: 'number' },
            { key: 'valor_por_litro', label: 'Valor/L', tipo: 'BRL' },
            { key: 'valor_total', label: 'Total', tipo: 'BRL' },
            { key: 'tipo_combustivel', label: 'Combustível', tipo: 'text' },
            { key: 'operador', label: 'Operador', tipo: 'text', largura: 25 },
          ],
          linhas: result.abastecimentos as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Uso',
          colunas: [
            { key: 'maquina_nome', label: 'Máquina', tipo: 'text', largura: 25 },
            { key: 'data_uso', label: 'Data', tipo: 'date' },
            { key: 'horas_trabalhadas', label: 'Horas', tipo: 'number' },
            { key: 'operacao', label: 'Operação', tipo: 'text', largura: 25 },
            { key: 'operador', label: 'Operador', tipo: 'text', largura: 25 },
            { key: 'observacoes', label: 'Observações', tipo: 'text', largura: 30 },
          ],
          linhas: result.usos as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Relatório de Frota exportado com sucesso!');
  });

  // ─── Financeiro ──────────────────────────────────────────────────────────────
  const exportFinanceiro = () => handleExport('financeiro', async () => {
    const { gte, lte } = toUtcRangeFromLocal(periodoFinanceiro.from, periodoFinanceiro.to);
    const dataInicio = gte.slice(0, 10);
    const dataFim = lte.slice(0, 10);

    const lancamentos = await q.financeiro.list({ dataInicio, dataFim });

    if (lancamentos.length === 10000) {
      toast.warning('Limite de 10.000 registros atingido. Refine o período para garantir dados completos.');
    }

    gerarExcel({
      fileName: `financeiro_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Financeiro Geral', periodo: periodoFinanceiro },
      sheets: [{
        nome: 'Financeiro',
        colunas: [
          { key: 'data', label: 'Data', tipo: 'date' },
          { key: 'tipo', label: 'Tipo', tipo: 'text' },
          { key: 'categoria', label: 'Categoria', tipo: 'text' },
          { key: 'descricao', label: 'Descrição', tipo: 'text', largura: 35 },
          { key: 'valor', label: 'Valor (R$)', tipo: 'BRL' },
        ],
        linhas: lancamentos.map((l) => ({
          data: l.data, tipo: l.tipo, categoria: l.categoria, descricao: l.descricao, valor: l.valor,
        })),
      }],
    });
    toast.success('Financeiro exportado com sucesso!');
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Relatórios e Análises</h2>
      </div>

      {/* ── Operação ─────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Operação</h3>
        <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">

          <li>
            <RelatorioCard
              titulo="Movimentação de Silos"
              descricao="Histórico completo de entradas e saídas de silagem."
              icone={Database}
              formatos={['excel']}
              onExport={() => exportSilos()}
              isLoading={loadingKey === 'silos'}
              loadingFormato="excel"
            />
          </li>

          <li>
            <RelatorioCard
              titulo="Produtividade por Talhão"
              descricao="Relatório detalhado de talhões, área e cultura atual."
              icone={Map}
              formatos={['excel']}
              onExport={() => exportTalhoes()}
              isLoading={loadingKey === 'talhoes'}
              loadingFormato="excel"
            />
          </li>

          <li>
            <RelatorioCard
              titulo="Custo Operacional da Frota"
              descricao="Manutenções, abastecimentos e uso de máquinas no período."
              icone={Truck}
              formatos={['excel']}
              onExport={() => exportFrota()}
              isLoading={loadingKey === 'frota'}
              loadingFormato="excel"
            >
              <PeriodoFilter value={periodoFrota} onChange={setPeriodoFrota} defaultPreset="ultimos_30" />
            </RelatorioCard>
          </li>

          <li>
            <RelatorioCard
              titulo="Posição de Estoque (Insumos)"
              descricao="Posição atual do estoque de insumos com NPK."
              icone={Package}
              formatos={['excel']}
              onExport={() => exportInsumos()}
              isLoading={loadingKey === 'insumos'}
              loadingFormato="excel"
            />
          </li>

          <li>
            <RelatorioCard
              titulo="Movimentação de Insumos"
              descricao="Entradas e saídas de insumos no período selecionado."
              icone={PackageOpen}
              formatos={['excel']}
              onExport={() => exportMovInsumos()}
              isLoading={loadingKey === 'mov_insumos'}
              loadingFormato="excel"
            >
              <PeriodoFilter value={periodoMovInsumos} onChange={setPeriodoMovInsumos} defaultPreset="ultimos_30" />
            </RelatorioCard>
          </li>

        </ul>
      </section>

      {/* ── Financeiro ─────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Financeiro</h3>
        <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">

          <li>
            <RelatorioCard
              titulo="Financeiro Geral"
              descricao="Demonstrativo de resultados e fluxo de caixa do período."
              icone={DollarSign}
              formatos={['excel']}
              onExport={() => exportFinanceiro()}
              isLoading={loadingKey === 'financeiro'}
              loadingFormato="excel"
            >
              <PeriodoFilter value={periodoFinanceiro} onChange={setPeriodoFinanceiro} defaultPreset="ultimos_365" />
            </RelatorioCard>
          </li>

        </ul>
      </section>

      {/* ── Outros (placeholder visual para fases futuras) ─── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Rebanho &amp; Produção — em breve (Fases 2 e 3)
        </h3>
        <p className="text-sm text-muted-foreground">
          Construtor de Rebanho, Pastagens, Mão de Obra, Histórico Sanitário e Balanço Forrageiro serão adicionados nas próximas fases.
        </p>
      </section>
    </div>
  );
}
