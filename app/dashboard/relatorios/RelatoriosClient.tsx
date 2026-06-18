'use client';

import { useState, useMemo } from 'react';
import {
  Database, Map, Truck, DollarSign, Package, PackageOpen,
  Users, Leaf, Scale, Stethoscope, ShoppingCart,
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
import { RelatorioRow } from '@/components/relatorios/RelatorioRow';
import { PeriodoFilter } from '@/components/relatorios/PeriodoFilter';
import { EntidadeFilter, ENTIDADE_TODOS, type EntidadeOption } from '@/components/relatorios/EntidadeFilter';
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
import { CowIcon } from '@/components/icons/CowIcon';

const hoje = new Date();

export interface EntidadesRelatorios {
  silos: EntidadeOption[];
  talhoes: EntidadeOption[];
  maquinas: EntidadeOption[];
  insumos: EntidadeOption[];
  produtos: EntidadeOption[];
  pastagens: EntidadeOption[];
  colaboradores: EntidadeOption[];
}

interface RelatoriosClientProps {
  fazendaId: string;
  fazendaNome: string;
  entidades: EntidadesRelatorios;
}

export function RelatoriosClient({ fazendaId, fazendaNome, entidades }: RelatoriosClientProps) {
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

  // Filtros por entidade ('todos' ou id)
  const [siloFiltro, setSiloFiltro] = useState(ENTIDADE_TODOS);
  const [talhaoFiltro, setTalhaoFiltro] = useState(ENTIDADE_TODOS);
  const [maquinaFiltro, setMaquinaFiltro] = useState(ENTIDADE_TODOS);
  const [insumoEstoqueFiltro, setInsumoEstoqueFiltro] = useState(ENTIDADE_TODOS);
  const [insumoMovFiltro, setInsumoMovFiltro] = useState(ENTIDADE_TODOS);
  const [produtoFiltro, setProdutoFiltro] = useState(ENTIDADE_TODOS);
  const [pastagemFiltro, setPastagemFiltro] = useState(ENTIDADE_TODOS);
  const [colaboradorFiltro, setColaboradorFiltro] = useState(ENTIDADE_TODOS);

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

  /** Sufixo no nome do arquivo quando há filtro por entidade. */
  const sufixoEntidade = (filtro: string, opcoes: EntidadeOption[]) => {
    if (filtro === ENTIDADE_TODOS) return '';
    const nome = opcoes.find((o) => o.id === filtro)?.nome;
    return nome ? `_${nome.replace(/\s+/g, '-').toLowerCase()}` : '';
  };

  // ─── Movimentação de Silos ─────────────────────────────────────────────────────
  const exportSilos = () => handleExport('silos', async () => {
    let silos = await q.silos.list();
    if (siloFiltro !== ENTIDADE_TODOS) silos = silos.filter((s) => s.id === siloFiltro);
    const movs = await q.movimentacoesSilo.listBySilos(silos.map((s) => s.id));
    const siloMap: Record<string, string> = {};
    silos.forEach((s) => { siloMap[s.id] = s.nome; });

    await gerarExcel({
      fileName: `silos${sufixoEntidade(siloFiltro, entidades.silos)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
  });

  // ─── Talhões ─────────────────────────────────────────────────────────────────
  const exportTalhoes = () => handleExport('talhoes', async () => {
    let talhoes = await q.talhoes.list();
    if (talhaoFiltro !== ENTIDADE_TODOS) talhoes = talhoes.filter((t) => t.id === talhaoFiltro);
    await gerarExcel({
      fileName: `talhoes${sufixoEntidade(talhaoFiltro, entidades.talhoes)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
  });

  // ─── Custo Operacional da Frota ───────────────────────────────────────────────
  const exportFrota = () => handleExport('frota', async () => {
    const result = await getRelatorioFrotaAction({
      from: periodoFrota.from.toISOString(),
      to: periodoFrota.to.toISOString(),
    });
    const filtraMaq = maquinaFiltro !== ENTIDADE_TODOS;
    const maquinas = filtraMaq ? result.maquinas.filter((m) => m.id === maquinaFiltro) : result.maquinas;
    const manutencoes = filtraMaq ? result.manutencoes.filter((m) => m.maquina_id === maquinaFiltro) : result.manutencoes;
    const abastecimentos = filtraMaq ? result.abastecimentos.filter((a) => a.maquina_id === maquinaFiltro) : result.abastecimentos;
    const usos = filtraMaq ? result.usos.filter((u) => u.maquina_id === maquinaFiltro) : result.usos;

    await gerarExcel({
      fileName: `frota${sufixoEntidade(maquinaFiltro, entidades.maquinas)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
          linhas: maquinas as unknown as Record<string, unknown>[],
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
          linhas: manutencoes as unknown as Record<string, unknown>[],
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
          linhas: abastecimentos as unknown as Record<string, unknown>[],
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
          linhas: usos as unknown as Record<string, unknown>[],
        },
      ],
    });
  });

  // ─── Posição de Estoque (Insumos) ─────────────────────────────────────────────
  const exportInsumos = () => handleExport('insumos', async () => {
    let insumos = await q.insumos.list();
    if (insumoEstoqueFiltro !== ENTIDADE_TODOS) insumos = insumos.filter((i) => i.id === insumoEstoqueFiltro);
    await gerarExcel({
      fileName: `insumos_estoque${sufixoEntidade(insumoEstoqueFiltro, entidades.insumos)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
  });

  // ─── Movimentação de Insumos ─────────────────────────────────────────────────
  const exportMovInsumos = () => handleExport('mov_insumos', async () => {
    const { rows } = await getMovimentacoesInsumoAction({
      from: periodoMovInsumos.from.toISOString(),
      to: periodoMovInsumos.to.toISOString(),
    });
    const filtradas = insumoMovFiltro === ENTIDADE_TODOS
      ? rows
      : rows.filter((r) => (r as unknown as { insumo_id?: string }).insumo_id === insumoMovFiltro);
    await gerarExcel({
      fileName: `insumos_movimentacoes${sufixoEntidade(insumoMovFiltro, entidades.insumos)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
        linhas: filtradas as unknown as Record<string, unknown>[],
      }],
    });
  });

  // ─── Produtos ────────────────────────────────────────────────────────────────
  const nomeProdutoFiltro = useMemo(
    () => entidades.produtos.find((p) => p.id === produtoFiltro)?.nome ?? null,
    [produtoFiltro, entidades.produtos],
  );

  const exportProdutos = () => handleExport('produtos', async () => {
    const result = await getRelatorioProdutosAction({
      from: periodoProdutos.from.toISOString(),
      to: periodoProdutos.to.toISOString(),
    });
    // ProdutoRow tem id; movimentações/vendas só expõem produto_nome — filtra por nome.
    const produtos = produtoFiltro === ENTIDADE_TODOS
      ? result.produtos
      : result.produtos.filter((p) => p.id === produtoFiltro);
    const movimentacoes = nomeProdutoFiltro
      ? result.movimentacoes.filter((m) => m.produto_nome === nomeProdutoFiltro)
      : result.movimentacoes;
    const vendas = nomeProdutoFiltro
      ? result.vendas.filter((v) => v.produto_nome === nomeProdutoFiltro)
      : result.vendas;
    await gerarExcel({
      fileName: `produtos${sufixoEntidade(produtoFiltro, entidades.produtos)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
          linhas: produtos.map((p) => ({ ...p, ativo: p.ativo ? 'Sim' : 'Não' })) as unknown as Record<string, unknown>[],
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
          linhas: movimentacoes as unknown as Record<string, unknown>[],
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
          linhas: vendas as unknown as Record<string, unknown>[],
        },
      ],
    });
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
  });

  // ─── Mão de Obra ─────────────────────────────────────────────────────────────
  const nomeColaboradorFiltro = useMemo(
    () => entidades.colaboradores.find((c) => c.id === colaboradorFiltro)?.nome ?? null,
    [colaboradorFiltro, entidades.colaboradores],
  );

  const exportMaoObraExcel = () => handleExport('mao_obra_excel', async () => {
    const result = await getRelatorioMaoObraAction({
      from: periodoMaoObra.from.toISOString(),
      to: periodoMaoObra.to.toISOString(),
    });
    const atividades = nomeColaboradorFiltro
      ? result.atividades.filter((a) => a.colaboradores.includes(nomeColaboradorFiltro))
      : result.atividades;
    const resumoColaboradores = nomeColaboradorFiltro
      ? result.resumoColaboradores.filter((c) => c.colaborador_nome === nomeColaboradorFiltro)
      : result.resumoColaboradores;
    await gerarExcel({
      fileName: `mao_obra${sufixoEntidade(colaboradorFiltro, entidades.colaboradores)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
          linhas: atividades as unknown as Record<string, unknown>[],
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
          linhas: resumoColaboradores as unknown as Record<string, unknown>[],
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
  });

  const exportMaoObraPdf = () => handleExport('mao_obra_pdf', async () => {
    const result = await getRelatorioMaoObraAction({
      from: periodoMaoObra.from.toISOString(),
      to: periodoMaoObra.to.toISOString(),
    });
    const resumoColaboradores = nomeColaboradorFiltro
      ? result.resumoColaboradores.filter((c) => c.colaborador_nome === nomeColaboradorFiltro)
      : result.resumoColaboradores;
    await gerarPdf({
      fileName: `mao_obra${sufixoEntidade(colaboradorFiltro, entidades.colaboradores)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`,
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
          linhas: (resumoColaboradores.slice(0, 10)) as unknown as Record<string, unknown>[],
        },
      ],
    });
  });

  // ─── Pastagens ────────────────────────────────────────────────────────────────
  const nomePastagemFiltro = useMemo(
    () => entidades.pastagens.find((p) => p.id === pastagemFiltro)?.nome ?? null,
    [pastagemFiltro, entidades.pastagens],
  );

  const exportPastagens = () => handleExport('pastagens', async () => {
    const result = await getRelatorioPastagensAction({
      from: periodoPastagens.from.toISOString(),
      to: periodoPastagens.to.toISOString(),
    });
    // PastagemRow tem id; piquetes/ocupações/eventos só expõem pastagem_nome — filtra por nome.
    const pastagens = pastagemFiltro === ENTIDADE_TODOS
      ? result.pastagens
      : result.pastagens.filter((p) => p.id === pastagemFiltro);
    const piquetes = nomePastagemFiltro
      ? result.piquetes.filter((p) => p.pastagem_nome === nomePastagemFiltro)
      : result.piquetes;
    const ocupacoes = nomePastagemFiltro
      ? result.ocupacoes.filter((o) => o.pastagem_nome === nomePastagemFiltro)
      : result.ocupacoes;
    const eventos = nomePastagemFiltro
      ? result.eventos.filter((e) => e.pastagem_nome === nomePastagemFiltro)
      : result.eventos;
    await gerarExcel({
      fileName: `pastagens${sufixoEntidade(pastagemFiltro, entidades.pastagens)}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
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
          linhas: pastagens as unknown as Record<string, unknown>[],
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
          linhas: piquetes as unknown as Record<string, unknown>[],
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
          linhas: ocupacoes as unknown as Record<string, unknown>[],
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
          linhas: eventos as unknown as Record<string, unknown>[],
        },
      ],
    });
  });

  // ─── Balanço Forrageiro ────────────────────────────────────────────────────────
  const exportBalancoForrageiro = () => handleExport('balanco', async () => {
    const result = await getRelatorioBalancoForrageiroAction(periodoBalanco);
    await gerarPdf({
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
  });

  // ─── Indicadores Zootécnicos ──────────────────────────────────────────────────
  const exportIndicadoresRebanho = () => handleExport('indicadores_rebanho', async () => {
    const result = await getRelatorioIndicadoresRebanhoAction();
    const hoje2 = new Date();
    const dataInicio = subDays(hoje2, 90);
    await gerarPdfIndicadoresRebanho({
      fazendaNome: result.fazendaNome,
      tipoExploracao: result.tipoExploracao,
      periodo: { dataInicio, dataFim: hoje2 },
      indicadores: result.indicadores,
    });
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
      await gerarPdfPlanejamento(data as Parameters<typeof gerarPdfPlanejamento>[0], fazendaNome);
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
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-primary">Relatórios e Análises</h2>
      </div>

      {/* ── Operação ─────────────────────────────────── */}
      <Secao titulo="Operação">
        <RelatorioRow
          titulo="Movimentação de Silos"
          descricao="Histórico completo de entradas e saídas de silagem."
          icone={Database}
          formatos={['excel']}
          onExport={() => exportSilos()}
          isLoading={loadingKey === 'silos'}
          loadingFormato="excel"
          filtros={
            <EntidadeFilter
              label="Silo"
              opcoes={entidades.silos}
              value={siloFiltro}
              onChange={setSiloFiltro}
              todosLabel="Todos os silos"
            />
          }
        />

        <RelatorioRow
          titulo="Produtividade por Talhão"
          descricao="Relatório detalhado de talhões, área e cultura atual."
          icone={Map}
          formatos={['excel']}
          onExport={() => exportTalhoes()}
          isLoading={loadingKey === 'talhoes'}
          loadingFormato="excel"
          filtros={
            <EntidadeFilter
              label="Talhão"
              opcoes={entidades.talhoes}
              value={talhaoFiltro}
              onChange={setTalhaoFiltro}
              todosLabel="Todos os talhões"
            />
          }
        />

        <RelatorioRow
          titulo="Custo Operacional da Frota"
          descricao="Manutenções, abastecimentos e uso de máquinas no período."
          icone={Truck}
          formatos={['excel']}
          onExport={() => exportFrota()}
          isLoading={loadingKey === 'frota'}
          loadingFormato="excel"
          filtros={
            <>
              <EntidadeFilter
                label="Máquina"
                opcoes={entidades.maquinas}
                value={maquinaFiltro}
                onChange={setMaquinaFiltro}
                todosLabel="Todas as máquinas"
              />
              <PeriodoFilter value={periodoFrota} onChange={setPeriodoFrota} defaultPreset="ultimos_30" />
            </>
          }
        />
      </Secao>

      {/* ── Estoque & Insumos ─────────────────────────────────── */}
      <Secao titulo="Estoque & Insumos">
        <RelatorioRow
          titulo="Posição de Estoque (Insumos)"
          descricao="Posição atual do estoque de insumos com NPK."
          icone={Package}
          formatos={['excel']}
          onExport={() => exportInsumos()}
          isLoading={loadingKey === 'insumos'}
          loadingFormato="excel"
          filtros={
            <EntidadeFilter
              label="Insumo"
              opcoes={entidades.insumos}
              value={insumoEstoqueFiltro}
              onChange={setInsumoEstoqueFiltro}
              todosLabel="Todos os insumos"
            />
          }
        />

        <RelatorioRow
          titulo="Movimentação de Insumos"
          descricao="Entradas e saídas de insumos no período selecionado."
          icone={PackageOpen}
          formatos={['excel']}
          onExport={() => exportMovInsumos()}
          isLoading={loadingKey === 'mov_insumos'}
          loadingFormato="excel"
          filtros={
            <>
              <EntidadeFilter
                label="Insumo"
                opcoes={entidades.insumos}
                value={insumoMovFiltro}
                onChange={setInsumoMovFiltro}
                todosLabel="Todos os insumos"
              />
              <PeriodoFilter value={periodoMovInsumos} onChange={setPeriodoMovInsumos} defaultPreset="ultimos_30" />
            </>
          }
        />

        <RelatorioRow
          titulo="Produtos"
          descricao="Catálogo de produtos, movimentações e vendas no período."
          icone={BoxesIcon}
          formatos={['excel']}
          onExport={() => exportProdutos()}
          isLoading={loadingKey === 'produtos'}
          loadingFormato="excel"
          filtros={
            <>
              <EntidadeFilter
                label="Produto"
                opcoes={entidades.produtos}
                value={produtoFiltro}
                onChange={setProdutoFiltro}
                todosLabel="Todos os produtos"
              />
              <PeriodoFilter value={periodoProdutos} onChange={setPeriodoProdutos} defaultPreset="ultimos_30" />
            </>
          }
        />

        <RelatorioRow
          titulo="Planejamento de Compras"
          descricao="Atividades planejadas e lista consolidada de insumos a comprar."
          icone={ShoppingCart}
          formatos={['excel']}
          onExport={() => exportPlanejamentoCompras()}
          isLoading={loadingKey === 'plan_compras'}
          loadingFormato="excel"
        />
      </Secao>

      {/* ── Financeiro ─────────────────────────────────── */}
      <Secao titulo="Financeiro">
        <RelatorioRow
          titulo="Financeiro Geral"
          descricao="Demonstrativo de resultados e fluxo de caixa do período."
          icone={DollarSign}
          formatos={['excel']}
          onExport={() => exportFinanceiro()}
          isLoading={loadingKey === 'financeiro'}
          loadingFormato="excel"
          filtros={<PeriodoFilter value={periodoFinanceiro} onChange={setPeriodoFinanceiro} defaultPreset="ultimos_365" />}
        />

        <RelatorioRow
          titulo="Mão de Obra"
          descricao="Atividades, custo por colaborador e resumo por tipo no período."
          icone={Users}
          formatos={['excel', 'pdf']}
          onExport={(fmt) => fmt === 'excel' ? exportMaoObraExcel() : exportMaoObraPdf()}
          isLoading={loadingKey === 'mao_obra_excel' || loadingKey === 'mao_obra_pdf'}
          loadingFormato={loadingKey === 'mao_obra_excel' ? 'excel' : loadingKey === 'mao_obra_pdf' ? 'pdf' : undefined}
          filtros={
            <>
              <EntidadeFilter
                label="Colaborador"
                opcoes={entidades.colaboradores}
                value={colaboradorFiltro}
                onChange={setColaboradorFiltro}
                todosLabel="Todos os colaboradores"
              />
              <PeriodoFilter value={periodoMaoObra} onChange={setPeriodoMaoObra} defaultPreset="ultimos_30" />
            </>
          }
        />
      </Secao>

      {/* ── Rebanho ───────────────────────────────────────── */}
      <Secao titulo="Rebanho">
        <RelatorioRow
          titulo="Construtor de Relatórios"
          descricao="Selecione campos personalizados e exporte dados do rebanho em Excel ou PDF."
          icone={CowIcon}
          formatos={['excel', 'pdf']}
          onExport={() => Promise.resolve()}
          href="/dashboard/relatorios/rebanho"
        />

        <RelatorioRow
          titulo="Indicadores Zootécnicos"
          descricao="PDF com GMD, taxas de natalidade, mortalidade, desfrute e mais (últimos 90 dias)."
          icone={FileBarChart}
          formatos={['pdf']}
          onExport={() => exportIndicadoresRebanho()}
          isLoading={loadingKey === 'indicadores_rebanho'}
          loadingFormato="pdf"
        />

        <RelatorioRow
          titulo="Histórico Sanitário"
          descricao="Vacinações, vermifugações, tratamentos e exames no período."
          icone={Stethoscope}
          formatos={['excel']}
          onExport={() => exportSanidade()}
          isLoading={loadingKey === 'sanidade'}
          loadingFormato="excel"
          filtros={<PeriodoFilter value={periodoSanidade} onChange={setPeriodoSanidade} defaultPreset="ultimos_90" />}
        />
      </Secao>

      {/* ── Produção & Forragem ───────────────────────────── */}
      <Secao titulo="Produção & Forragem">
        <RelatorioRow
          titulo="Pastagens"
          descricao="Pastagens, piquetes, ocupações e eventos de manejo no período."
          icone={Leaf}
          formatos={['excel']}
          onExport={() => exportPastagens()}
          isLoading={loadingKey === 'pastagens'}
          loadingFormato="excel"
          filtros={
            <>
              <EntidadeFilter
                label="Pastagem"
                opcoes={entidades.pastagens}
                value={pastagemFiltro}
                onChange={setPastagemFiltro}
                todosLabel="Todas as pastagens"
              />
              <PeriodoFilter value={periodoPastagens} onChange={setPeriodoPastagens} defaultPreset="ultimos_30" />
            </>
          }
        />

        <RelatorioRow
          titulo="Balanço Forrageiro"
          descricao="PDF executivo com estoque, consumo histórico e demanda projetada do rebanho."
          icone={Scale}
          formatos={['pdf']}
          onExport={() => exportBalancoForrageiro()}
          isLoading={loadingKey === 'balanco'}
          loadingFormato="pdf"
          filtros={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Período histórico:</span>
              <Select
                value={String(periodoBalanco)}
                onValueChange={(v) => setPeriodoBalanco(Number(v) as 7 | 30 | 60 | 90)}
              >
                <SelectTrigger className="h-8 text-sm w-24">
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
          }
        />

        <RelatorioRow
          titulo="Planejamento de Silagem"
          descricao="PDF do planejamento de silagem com dimensionamento de silo e rebanho."
          icone={BoxesIcon}
          formatos={['pdf']}
          onExport={() => iniciarExportPlanejamentoSilagem()}
          isLoading={loadingKey === 'plan_silagem_list' || loadingKey === 'plan_silagem'}
          loadingFormato="pdf"
          filtros={
            showPlanejamentoSelect && planejamentosDisponiveis.length > 1 ? (
              <div className="flex items-center gap-2">
                <Select value={planejamentoSelecionado} onValueChange={(v) => v && setPlanejamentoSelecionado(v)}>
                  <SelectTrigger className="h-8 text-sm w-[180px]">
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
                  className="h-8 text-sm"
                  onClick={() => exportarPlanejamentoSilagem(planejamentoSelecionado)}
                  disabled={!planejamentoSelecionado || loadingKey === 'plan_silagem'}
                >
                  Gerar selecionado
                </Button>
              </div>
            ) : undefined
          }
        />
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
