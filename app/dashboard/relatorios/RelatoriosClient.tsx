'use client';

import { useState, useMemo } from 'react';
import {
  Database, Map, Truck, DollarSign, Package, PackageOpen,
  PawPrint, Users, Leaf, Scale, Stethoscope, ShoppingCart,
  BoxesIcon, FileBarChart,
} from 'lucide-react';
import { toast } from 'sonner';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { q } from '@/lib/supabase/queries-audit';
import { gerarExcel } from '@/lib/relatorios/excel-builder';
import { gerarPdf } from '@/lib/relatorios/pdf-builder';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';
import { RelatorioCard } from '@/components/relatorios/RelatorioCard';
import { PeriodoFilter } from '@/components/relatorios/PeriodoFilter';
import {
  getRelatorioMaoObraAction,
  getRelatorioPastagensAction,
  getRelatorioProdutosAction,
  getRelatorioPlanejamentoComprasAction,
  getRelatorioBalancoForrageiroAction,
  getRelatorioSanidadeAction,
  getRelatorioIndicadoresRebanhoAction,
  listPlanejamentosSilagemAction,
  getPlanejamentoSilagemParaPdfAction,
  getRelatorioFrotaAction,
  getMovimentacoesInsumoAction,
} from './actions';
import { gerarPdfIndicadoresRebanho } from '@/lib/pdf/gerarPdfIndicadoresRebanho';
import { gerarPdfPlanejamento } from '@/lib/pdf/gerarPdfPlanejamento';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import { CowIcon } from '@/components/icons/CowIcon';

const hoje = new Date();

export function RelatoriosClient({ fazendaId, fazendaNome }: { fazendaId: string; fazendaNome: string }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Períodos por relatório
  const [periodoMovInsumos, setPeriodoMovInsumos] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoFrota, setPeriodoFrota] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoFinanceiro, setPeriodoFinanceiro] = useState({ from: subDays(hoje, 365), to: hoje });
  const [periodoMaoObra, setPeriodoMaoObra] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoPastagens, setPeriodoPastagens] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoProdutos, setPeriodoProdutos] = useState({ from: subDays(hoje, 30), to: hoje });
  const [periodoSanidade, setPeriodoSanidade] = useState({ from: subDays(hoje, 90), to: hoje });
  const [periodoBalanco, setPeriodoBalanco] = useState<7 | 30 | 60 | 90>(30);

  // Estado do Planejamento de Silagem
  const [planejamentosDisponiveis, setPlanejamentosDisponiveis] = useState<Array<{ id: string; nome: string | null; created_at: string }>>([]);
  const [planejamentoSelecionado, setPlanejamentoSelecionado] = useState<string>('');
  const [showPlanejamentoSelect, setShowPlanejamentoSelect] = useState(false);

  const metaBase = useMemo(() => ({
    fazendaNome,
    geradoEm: new Date(),
    nomeRelatorio: '',
  }), [fazendaNome]);

  const handleExport = async (key: string, fn: () => Promise<void>, label = 'Relatório') => {
    if (!fazendaId) {
      toast.error('Fazenda não identificada. Tente novamente.');
      return;
    }
    setLoadingKey(key);
    await toast.promise(fn().finally(() => setLoadingKey(null)), {
      loading: `Gerando ${label}...`,
      success: `${label} exportado com sucesso!`,
      error: 'Erro ao gerar relatório. Tente novamente.',
    });
  };

  // ─── Silos ───────────────────────────────────────────────────────────────────
  const exportSilos = () => handleExport('silos', async () => {
    const silos = await q.silos.list();
    const movs = await q.movimentacoesSilo.listBySilos(silos.map((s) => s.id));
    const siloMap: Record<string, string> = {};
    silos.forEach((s) => { siloMap[s.id] = s.nome; });

    await gerarExcel({
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
    await gerarExcel({
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
    await gerarExcel({
      fileName: `insumos_estoque_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Posição de Estoque (Insumos)' },
      sheets: [{
        nome: 'Estoque de Insumos',
        colunas: [
          { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
          { key: 'unidade', label: 'Unidade', tipo: 'text' },
          { key: 'estoque_atual', label: 'Estoque Atual', tipo: 'number' },
          { key: 'estoque_minimo', label: 'Estoque Mínimo', tipo: 'number' },
        ],
        linhas: insumos.map((i) => ({
          nome: i.nome, unidade: i.unidade,
          estoque_atual: i.estoque_atual, estoque_minimo: i.estoque_minimo,
        })),
      }],
    });
    toast.success('Posição de Estoque exportada com sucesso!');
  });

  // ─── Movimentação de Insumos ─────────────────────────────────────────────────
  const exportMovInsumos = () => handleExport('mov_insumos', async () => {
    const { rows } = await getMovimentacoesInsumoAction({
      from: periodoMovInsumos.from.toISOString(),
      to: periodoMovInsumos.to.toISOString(),
    });
    await gerarExcel({
      fileName: `insumos_movimentacoes_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Movimentação de Insumos', periodo: periodoMovInsumos },
      sheets: [{
        nome: 'Movimentações',
        colunas: [
          { key: 'data', label: 'Data', tipo: 'date' },
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
    const result = await getRelatorioFrotaAction({
      from: periodoFrota.from.toISOString(),
      to: periodoFrota.to.toISOString(),
    });
    await gerarExcel({
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
            { key: 'preco_litro', label: 'Preço/L', tipo: 'BRL' },
            { key: 'valor', label: 'Total', tipo: 'BRL' },
            { key: 'combustivel', label: 'Combustível', tipo: 'text' },
            { key: 'fornecedor', label: 'Fornecedor', tipo: 'text', largura: 25 },
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

    await gerarExcel({
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

  // ─── Mão de Obra ─────────────────────────────────────────────────────────────
  const exportMaoObraExcel = () => handleExport('mao_obra_excel', async () => {
    const result = await getRelatorioMaoObraAction({
      from: periodoMaoObra.from.toISOString(),
      to: periodoMaoObra.to.toISOString(),
    });
    await gerarExcel({
      fileName: `mao_obra_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Mão de Obra', periodo: periodoMaoObra, fazendaNome: result.fazendaNome },
      sheets: [
        {
          nome: 'Atividades',
          colunas: [
            { key: 'data_inicio', label: 'Data Início', tipo: 'date' },
            { key: 'tipo_atividade', label: 'Tipo', tipo: 'text', largura: 25 },
            { key: 'colaboradores', label: 'Colaboradores', tipo: 'text', largura: 30 },
            { key: 'duracao_valor', label: 'Duração', tipo: 'number' },
            { key: 'duracao_tipo', label: 'Unid.', tipo: 'text' },
            { key: 'custo_final', label: 'Custo (R$)', tipo: 'BRL' },
            { key: 'vinculo_tipo', label: 'Vínculo', tipo: 'text' },
            { key: 'vinculo_nome', label: 'Local', tipo: 'text', largura: 25 },
            { key: 'descricao', label: 'Descrição', tipo: 'text', largura: 30 },
          ],
          linhas: result.atividades as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Resumo por Colaborador',
          colunas: [
            { key: 'colaborador_nome', label: 'Colaborador', tipo: 'text', largura: 25 },
            { key: 'funcao', label: 'Função', tipo: 'text' },
            { key: 'vinculo', label: 'Vínculo', tipo: 'text' },
            { key: 'qtd_atividades', label: 'Qtd. Atividades', tipo: 'number' },
            { key: 'custo_total', label: 'Custo Total (R$)', tipo: 'BRL' },
          ],
          linhas: result.resumoColaboradores as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Resumo por Tipo',
          colunas: [
            { key: 'tipo_atividade', label: 'Tipo de Atividade', tipo: 'text', largura: 30 },
            { key: 'qtd_atividades', label: 'Qtd.', tipo: 'number' },
            { key: 'custo_total', label: 'Custo Total (R$)', tipo: 'BRL' },
            { key: 'duracao_total_horas', label: 'Horas Totais', tipo: 'number' },
          ],
          linhas: result.resumoTipos as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Relatório de Mão de Obra (Excel) exportado com sucesso!');
  });

  const exportMaoObraPdf = () => handleExport('mao_obra_pdf', async () => {
    const result = await getRelatorioMaoObraAction({
      from: periodoMaoObra.from.toISOString(),
      to: periodoMaoObra.to.toISOString(),
    });
    gerarPdf({
      fileName: `mao_obra_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`,
      titulo: 'Relatório de Mão de Obra',
      orientacao: 'portrait',
      metadata: {
        ...metaBase,
        nomeRelatorio: 'Mão de Obra',
        periodo: periodoMaoObra,
        fazendaNome: result.fazendaNome,
      },
      secoes: [
        {
          titulo: 'Top 10 Colaboradores por Custo',
          colunas: [
            { key: 'colaborador_nome', label: 'Colaborador', largura: 30 },
            { key: 'funcao', label: 'Função', largura: 20 },
            { key: 'qtd_atividades', label: 'Atividades', tipo: 'number', largura: 15 },
            { key: 'custo_total', label: 'Custo Total', tipo: 'BRL', largura: 25 },
          ],
          linhas: (result.resumoColaboradores.slice(0, 10)) as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Relatório de Mão de Obra (PDF) exportado com sucesso!');
  });

  // ─── Pastagens ────────────────────────────────────────────────────────────────
  const exportPastagens = () => handleExport('pastagens', async () => {
    const result = await getRelatorioPastagensAction({
      from: periodoPastagens.from.toISOString(),
      to: periodoPastagens.to.toISOString(),
    });
    await gerarExcel({
      fileName: `pastagens_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Pastagens', periodo: periodoPastagens, fazendaNome: result.fazendaNome },
      sheets: [
        {
          nome: 'Pastagens',
          colunas: [
            { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
            { key: 'especie', label: 'Espécie', tipo: 'text', largura: 25 },
            { key: 'sistema_pastejo', label: 'Sistema', tipo: 'text' },
            { key: 'area_total_ha', label: 'Área (ha)', tipo: 'number' },
            { key: 'qtd_piquetes', label: 'Total Piquetes', tipo: 'number' },
            { key: 'piquetes_em_pastejo', label: 'Em Pastejo', tipo: 'number' },
            { key: 'piquetes_descanso', label: 'Em Descanso', tipo: 'number' },
          ],
          linhas: result.pastagens as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Piquetes',
          colunas: [
            { key: 'pastagem_nome', label: 'Pastagem', tipo: 'text', largura: 25 },
            { key: 'nome', label: 'Piquete', tipo: 'text', largura: 20 },
            { key: 'area_ha', label: 'Área (ha)', tipo: 'number' },
            { key: 'status', label: 'Status', tipo: 'text' },
            { key: 'ua_suportada', label: 'UA Suportada', tipo: 'number' },
            { key: 'ua_atual', label: 'UA Atual', tipo: 'number' },
            { key: 'lote_atual', label: 'Lote Atual', tipo: 'text', largura: 20 },
          ],
          linhas: result.piquetes as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Ocupações',
          colunas: [
            { key: 'pastagem_nome', label: 'Pastagem', tipo: 'text', largura: 20 },
            { key: 'piquete_nome', label: 'Piquete', tipo: 'text', largura: 20 },
            { key: 'lote_nome', label: 'Lote', tipo: 'text', largura: 20 },
            { key: 'data_entrada', label: 'Entrada', tipo: 'date' },
            { key: 'data_saida_real', label: 'Saída Real', tipo: 'date' },
            { key: 'dias_ocupacao', label: 'Dias', tipo: 'number' },
            { key: 'ua_real', label: 'UA Real', tipo: 'number' },
            { key: 'metodo_calculo_ua', label: 'Método UA', tipo: 'text' },
          ],
          linhas: result.ocupacoes as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Eventos de Manejo',
          colunas: [
            { key: 'pastagem_nome', label: 'Pastagem', tipo: 'text', largura: 20 },
            { key: 'piquete_nome', label: 'Piquete', tipo: 'text', largura: 20 },
            { key: 'data_evento', label: 'Data', tipo: 'date' },
            { key: 'tipo', label: 'Tipo', tipo: 'text', largura: 25 },
            { key: 'custo', label: 'Custo (R$)', tipo: 'BRL' },
            { key: 'insumo_nome', label: 'Insumo', tipo: 'text', largura: 20 },
            { key: 'maquina_nome', label: 'Máquina', tipo: 'text', largura: 20 },
            { key: 'descricao', label: 'Descrição', tipo: 'text', largura: 30 },
          ],
          linhas: result.eventos as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Relatório de Pastagens exportado com sucesso!');
  });

  // ─── Produtos ────────────────────────────────────────────────────────────────
  const exportProdutos = () => handleExport('produtos', async () => {
    const result = await getRelatorioProdutosAction({
      from: periodoProdutos.from.toISOString(),
      to: periodoProdutos.to.toISOString(),
    });
    await gerarExcel({
      fileName: `produtos_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Produtos', periodo: periodoProdutos, fazendaNome: result.fazendaNome },
      sheets: [
        {
          nome: 'Produtos',
          colunas: [
            { key: 'nome', label: 'Nome', tipo: 'text', largura: 25 },
            { key: 'categoria_nome', label: 'Categoria', tipo: 'text', largura: 20 },
            { key: 'unidade_medida', label: 'Unidade', tipo: 'text' },
            { key: 'estoque_atual', label: 'Estoque Atual', tipo: 'number' },
            { key: 'estoque_minimo', label: 'Estoque Mínimo', tipo: 'number' },
            { key: 'valor_unitario', label: 'Valor Unit.', tipo: 'BRL' },
            { key: 'ativo', label: 'Ativo', tipo: 'text' },
          ],
          linhas: result.produtos.map((p) => ({ ...p, ativo: p.ativo ? 'Sim' : 'Não' })) as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Movimentações',
          colunas: [
            { key: 'data', label: 'Data', tipo: 'date' },
            { key: 'produto_nome', label: 'Produto', tipo: 'text', largura: 25 },
            { key: 'tipo', label: 'Tipo', tipo: 'text' },
            { key: 'tipo_saida', label: 'Tipo Saída', tipo: 'text' },
            { key: 'quantidade', label: 'Qtd.', tipo: 'number' },
            { key: 'valor_unitario', label: 'Valor Unit.', tipo: 'BRL' },
            { key: 'valor_total', label: 'Total', tipo: 'BRL' },
            { key: 'descricao', label: 'Descrição', tipo: 'text', largura: 30 },
            { key: 'responsavel', label: 'Responsável', tipo: 'text', largura: 25 },
          ],
          linhas: result.movimentacoes as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Vendas',
          colunas: [
            { key: 'data', label: 'Data', tipo: 'date' },
            { key: 'produto_nome', label: 'Produto', tipo: 'text', largura: 25 },
            { key: 'quantidade', label: 'Qtd.', tipo: 'number' },
            { key: 'valor_unitario', label: 'Valor Unit.', tipo: 'BRL' },
            { key: 'valor_total', label: 'Total', tipo: 'BRL' },
            { key: 'descricao', label: 'Descrição', tipo: 'text', largura: 30 },
            { key: 'responsavel', label: 'Responsável', tipo: 'text', largura: 25 },
          ],
          linhas: result.vendas as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Relatório de Produtos exportado com sucesso!');
  });

  // ─── Planejamento de Compras ──────────────────────────────────────────────────
  const exportPlanejamentoCompras = () => handleExport('plan_compras', async () => {
    const result = await getRelatorioPlanejamentoComprasAction();
    await gerarExcel({
      fileName: `planejamento_compras_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Planejamento de Compras', fazendaNome: result.fazendaNome },
      sheets: [
        {
          nome: 'Atividades Planejadas',
          colunas: [
            { key: 'nome', label: 'Atividade', tipo: 'text', largura: 35 },
            { key: 'tipo_operacao', label: 'Tipo', tipo: 'text', largura: 20 },
            { key: 'data_prevista', label: 'Data Prevista', tipo: 'date' },
            { key: 'talhao_nome', label: 'Talhão', tipo: 'text', largura: 20 },
            { key: 'status', label: 'Status', tipo: 'text' },
            { key: 'qtd_insumos', label: 'Qtd. Insumos', tipo: 'number' },
          ],
          linhas: result.atividades as unknown as Record<string, unknown>[],
        },
        {
          nome: 'Lista de Compras',
          colunas: [
            { key: 'insumo_nome', label: 'Insumo', tipo: 'text', largura: 25 },
            { key: 'unidade_medida', label: 'Unidade', tipo: 'text' },
            { key: 'quantidade_total', label: 'Qtd. Planejada', tipo: 'number' },
            { key: 'estoque_atual', label: 'Estoque Atual', tipo: 'number' },
            { key: 'quantidade_a_comprar', label: 'Qtd. a Comprar', tipo: 'number' },
            { key: 'valor_estimado', label: 'Valor Estimado', tipo: 'BRL' },
            { key: 'status_compra', label: 'Status', tipo: 'text' },
          ],
          linhas: result.listaCompras as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Planejamento de Compras exportado com sucesso!');
  });

  // ─── Balanço Forrageiro ────────────────────────────────────────────────────────
  const exportBalancoForrageiro = () => handleExport('balanco', async () => {
    const result = await getRelatorioBalancoForrageiroAction(periodoBalanco);
    gerarPdf({
      fileName: `balanco_forrageiro_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`,
      titulo: 'Balanço Forrageiro',
      orientacao: 'portrait',
      metadata: {
        ...metaBase,
        nomeRelatorio: 'Balanço Forrageiro',
        periodo: result.periodoHistorico,
        fazendaNome: result.fazendaNome,
        geradoEm: result.geradoEm,
      },
      secoes: [
        {
          titulo: `KPIs — Período de ${periodoBalanco} dias`,
          colunas: [
            { key: 'indicador', label: 'Indicador', largura: 50 },
            { key: 'valor', label: 'Valor', largura: 50 },
          ],
          linhas: [
            { indicador: 'Estoque Atual (ton MS)', valor: result.estoqueAtualTonMS.toFixed(2) },
            { indicador: 'Consumo Médio Diário (kg)', valor: result.consumoDiarioMedioKg != null ? result.consumoDiarioMedioKg.toFixed(1) : '—' },
            { indicador: 'Demanda Diária Rebanho (kg)', valor: result.demandaDiariaKg.toFixed(1) },
            { indicador: 'Autonomia Histórica (dias)', valor: result.autonomiaHistoricaDias != null ? String(result.autonomiaHistoricaDias) : '—' },
            { indicador: 'Autonomia Projetada (dias)', valor: result.autonomiaProjetadaDias != null ? String(result.autonomiaProjetadaDias) : '—' },
          ],
        },
        {
          titulo: 'Demanda por Categoria Animal',
          colunas: [
            { key: 'categoria', label: 'Categoria', largura: 35 },
            { key: 'qtdAnimais', label: 'Animais', tipo: 'number', largura: 15 },
            { key: 'consumoKgDia', label: 'kg MS/dia', tipo: 'number', largura: 20 },
            { key: 'estimado', label: 'Estimado', largura: 15 },
          ],
          linhas: result.detalhesPorCategoria.map((c) => ({
            ...c,
            estimado: c.estimado ? 'Sim' : 'Não',
          })) as unknown as Record<string, unknown>[],
        },
      ],
    });
    toast.success('Balanço Forrageiro (PDF) exportado com sucesso!');
  });

  // ─── Indicadores Zootécnicos ──────────────────────────────────────────────────
  const exportIndicadoresRebanho = () => handleExport('indicadores_rebanho', async () => {
    const result = await getRelatorioIndicadoresRebanhoAction();
    const hoje2 = new Date();
    const dataInicio = subDays(hoje2, 90);
    gerarPdfIndicadoresRebanho({
      fazendaNome: result.fazendaNome,
      tipoExploracao: result.tipoExploracao,
      periodo: { dataInicio, dataFim: hoje2 },
      indicadores: result.indicadores,
    });
    toast.success('Indicadores Zootécnicos (PDF) exportado com sucesso!');
  });

  // ─── Planejamento de Silagem ──────────────────────────────────────────────────
  const iniciarExportPlanejamentoSilagem = async () => {
    setLoadingKey('plan_silagem_list');
    try {
      const { planejamentos } = await listPlanejamentosSilagemAction();
      if (planejamentos.length === 0) {
        toast.error('Nenhum planejamento de silagem encontrado.');
        return;
      }
      if (planejamentos.length === 1) {
        await exportarPlanejamentoSilagem(planejamentos[0].id);
      } else {
        setPlanejamentosDisponiveis(planejamentos);
        setPlanejamentoSelecionado(planejamentos[0].id);
        setShowPlanejamentoSelect(true);
      }
    } catch {
      toast.error('Erro ao listar planejamentos.');
    } finally {
      setLoadingKey(null);
    }
  };

  const exportarPlanejamentoSilagem = async (id: string) => {
    await handleExport('plan_silagem', async () => {
      const data = await getPlanejamentoSilagemParaPdfAction(id);
      gerarPdfPlanejamento(data as Parameters<typeof gerarPdfPlanejamento>[0], fazendaNome);
      toast.success('Planejamento de Silagem (PDF) exportado com sucesso!');
      setShowPlanejamentoSelect(false);
    });
  };

  // ─── Histórico Sanitário ──────────────────────────────────────────────────────
  const exportSanidade = () => handleExport('sanidade', async () => {
    const result = await getRelatorioSanidadeAction({
      from: periodoSanidade.from.toISOString(),
      to: periodoSanidade.to.toISOString(),
    });

    const tipos = ['vacinacao', 'vermifugacao', 'tratamento_veterinario', 'exame_laboratorial'];
    const labels: Record<string, string> = {
      vacinacao: 'Vacinação',
      vermifugacao: 'Vermifugação',
      tratamento_veterinario: 'Tratamento Veterinário',
      exame_laboratorial: 'Exame Laboratorial',
    };

    const sheets = tipos.map((tipo) => ({
      nome: labels[tipo],
      colunas: [
        { key: 'data_evento', label: 'Data', tipo: 'date' as const },
        { key: 'animal_brinco', label: 'Brinco', tipo: 'text' as const },
        { key: 'animal_nome', label: 'Nome', tipo: 'text' as const, largura: 20 },
        { key: 'lote_nome', label: 'Lote', tipo: 'text' as const, largura: 20 },
        { key: 'produto_medicamento', label: 'Produto/Medicamento', tipo: 'text' as const, largura: 25 },
        { key: 'dose', label: 'Dose', tipo: 'text' as const },
        { key: 'via_aplicacao', label: 'Via', tipo: 'text' as const },
        { key: 'veterinario', label: 'Veterinário', tipo: 'text' as const, largura: 25 },
        { key: 'proxima_data', label: 'Próxima Data', tipo: 'date' as const },
        { key: 'observacoes', label: 'Observações', tipo: 'text' as const, largura: 30 },
      ],
      linhas: result.eventos.filter((e) => e.tipo === tipo) as unknown as Record<string, unknown>[],
    }));

    await gerarExcel({
      fileName: `historico_sanitario_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
      metadata: { ...metaBase, nomeRelatorio: 'Histórico Sanitário', periodo: periodoSanidade, fazendaNome: result.fazendaNome },
      sheets,
    });
    toast.success('Histórico Sanitário exportado com sucesso!');
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

          <li>
            <RelatorioCard
              titulo="Mão de Obra"
              descricao="Atividades, custo por colaborador e resumo por tipo no período."
              icone={Users}
              formatos={['excel', 'pdf']}
              onExport={(fmt) => fmt === 'excel' ? exportMaoObraExcel() : exportMaoObraPdf()}
              isLoading={loadingKey === 'mao_obra_excel' || loadingKey === 'mao_obra_pdf'}
              loadingFormato={loadingKey === 'mao_obra_excel' ? 'excel' : loadingKey === 'mao_obra_pdf' ? 'pdf' : undefined}
            >
              <PeriodoFilter value={periodoMaoObra} onChange={setPeriodoMaoObra} defaultPreset="ultimos_30" />
            </RelatorioCard>
          </li>

        </ul>
      </section>

      {/* ── Rebanho ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rebanho</h3>
        <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">

          <li>
            <RelatorioCard
              titulo="Construtor de Relatórios"
              descricao="Selecione campos personalizados e exporte dados do rebanho em Excel ou PDF."
              icone={CowIcon}
              formatos={['excel', 'pdf']}
              onExport={() => Promise.resolve()}
              href="/dashboard/relatorios/rebanho"
            />
          </li>

          <li>
            <RelatorioCard
              titulo="Indicadores Zootécnicos"
              descricao="PDF com GMD, taxas de natalidade, mortalidade, desfrute e mais (últimos 90 dias)."
              icone={FileBarChart}
              formatos={['pdf']}
              onExport={() => exportIndicadoresRebanho()}
              isLoading={loadingKey === 'indicadores_rebanho'}
              loadingFormato="pdf"
            />
          </li>

          <li>
            <RelatorioCard
              titulo="Histórico Sanitário"
              descricao="Vacinações, vermifugações, tratamentos e exames no período."
              icone={Stethoscope}
              formatos={['excel']}
              onExport={() => exportSanidade()}
              isLoading={loadingKey === 'sanidade'}
              loadingFormato="excel"
            >
              <PeriodoFilter value={periodoSanidade} onChange={setPeriodoSanidade} defaultPreset="ultimos_90" />
            </RelatorioCard>
          </li>

        </ul>
      </section>

      {/* ── Produção & Forragem ───────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Produção &amp; Forragem</h3>
        <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">

          <li>
            <RelatorioCard
              titulo="Pastagens"
              descricao="Pastagens, piquetes, ocupações e eventos de manejo no período."
              icone={Leaf}
              formatos={['excel']}
              onExport={() => exportPastagens()}
              isLoading={loadingKey === 'pastagens'}
              loadingFormato="excel"
            >
              <PeriodoFilter value={periodoPastagens} onChange={setPeriodoPastagens} defaultPreset="ultimos_30" />
            </RelatorioCard>
          </li>

          <li>
            <RelatorioCard
              titulo="Balanço Forrageiro"
              descricao="PDF executivo com estoque, consumo histórico e demanda projetada do rebanho."
              icone={Scale}
              formatos={['pdf']}
              onExport={() => exportBalancoForrageiro()}
              isLoading={loadingKey === 'balanco'}
              loadingFormato="pdf"
            >
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Período histórico:</span>
                <Select
                  value={String(periodoBalanco)}
                  onValueChange={(v) => setPeriodoBalanco(Number(v) as 7 | 30 | 60 | 90)}
                >
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </RelatorioCard>
          </li>

          <li>
            <RelatorioCard
              titulo="Planejamento de Silagem"
              descricao="PDF do planejamento de silagem com dimensionamento de silo e rebanho."
              icone={BoxesIcon}
              formatos={['pdf']}
              onExport={() => iniciarExportPlanejamentoSilagem()}
              isLoading={loadingKey === 'plan_silagem_list' || loadingKey === 'plan_silagem'}
              loadingFormato="pdf"
            >
              {showPlanejamentoSelect && planejamentosDisponiveis.length > 1 && (
                <div className="mt-2 space-y-2">
                  <Select value={planejamentoSelecionado} onValueChange={(v) => v && setPlanejamentoSelecionado(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar planejamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {planejamentosDisponiveis.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome ?? format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-7 text-xs w-full"
                    onClick={() => exportarPlanejamentoSilagem(planejamentoSelecionado)}
                    disabled={!planejamentoSelecionado || loadingKey === 'plan_silagem'}
                  >
                    Gerar PDF do selecionado
                  </Button>
                </div>
              )}
            </RelatorioCard>
          </li>

        </ul>
      </section>

      {/* ── Planejamento ─────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Planejamento</h3>
        <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">

          <li>
            <RelatorioCard
              titulo="Planejamento de Compras"
              descricao="Atividades planejadas e lista consolidada de insumos a comprar."
              icone={ShoppingCart}
              formatos={['excel']}
              onExport={() => exportPlanejamentoCompras()}
              isLoading={loadingKey === 'plan_compras'}
              loadingFormato="excel"
            />
          </li>

          <li>
            <RelatorioCard
              titulo="Produtos"
              descricao="Catálogo de produtos, movimentações e vendas no período."
              icone={BoxesIcon}
              formatos={['excel']}
              onExport={() => exportProdutos()}
              isLoading={loadingKey === 'produtos'}
              loadingFormato="excel"
            >
              <PeriodoFilter value={periodoProdutos} onChange={setPeriodoProdutos} defaultPreset="ultimos_30" />
            </RelatorioCard>
          </li>

        </ul>
      </section>
    </div>
  );
}
