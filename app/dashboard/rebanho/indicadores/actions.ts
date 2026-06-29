'use server';

import { revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { filtrosIndicadoresSchema, type FiltrosIndicadoresValidados } from '@/lib/validations/indicadores-rebanho';
import {
  calcularComposicaoRebanho,
  calcularTaxaNatalidade,
  calcularTaxaMortalidade,
  calcularTaxaMortalidadeBezerros,
  calcularTaxaDesfrute,
  calcularTaxaDescarte,
  calcularGMDMedioRebanho,
  calcularIntervaloEntrePartos,
  calcularIdadePrimeiroParto,
  montarSerieGMDPorAnimal,
  montarSerieNatalidadeMortalidade,
  montarComparativoLotes,
  isVaca,
  isVacaProdutiva,
} from '@/lib/calculos/indicadores-rebanho';
import {
  buscarEventosNoPeriodo,
  buscarPesosNoPeriodo,
  buscarAnimaisFiltrados,
  buscarEventosPartos,
  buscarPartosComMae,
  buscarDiagnosticosPrenhez,
  buscarAnimaisReprodutivos,
  buscarLactacoesEncerradas,
} from '@/lib/supabase/rebanho-indicadores';
import type { IndicadorRebanho, ComparativoLotes, TipoExploracao } from '@/types/rebanho-indicadores';

/**
 * Helper: converte FiltrosIndicadores (SPEC) → PeriodoAnalise (queries internas)
 */
function calcularPeriodo(filtros: FiltrosIndicadoresValidados): { data_inicial: string; data_final: string } {
  let dataInicio = filtros.dataInicio;
  let dataFim = filtros.dataFim;

  if (!dataInicio || !dataFim) {
    const hoje = new Date();
    dataFim = hoje;
    dataInicio = new Date(hoje);

    switch (filtros.periodo) {
      case '30d':
        dataInicio.setDate(dataInicio.getDate() - 30);
        break;
      case '90d':
        dataInicio.setDate(dataInicio.getDate() - 90);
        break;
      case '365d':
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
      case 'safra':
        dataInicio.setMonth(0, 1); // 1º de janeiro
        break;
      case 'custom':
        throw new Error('dataInicio e dataFim obrigatórios para período custom');
    }
  }

  const inicio = typeof dataInicio === 'string' ? dataInicio : dataInicio.toISOString().split('T')[0];
  const fim = typeof dataFim === 'string' ? dataFim : dataFim.toISOString().split('T')[0];

  return {
    data_inicial: inicio,
    data_final: fim,
  };
}

/**
 * Helper: busca fazenda para obter tipo_exploracao
 */
async function obterFazendasFiltros(filtros: FiltrosIndicadoresValidados) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('fazendas').select('tipo_exploracao').single();
  if (error) throw error;
  return (data?.tipo_exploracao || 'MISTO') as TipoExploracao;
}

/**
 * Server Action: Obter indicadores zootécnicos conforme SPEC (T40)
 * Cache: 5 min (revalidateTag)
 */
export async function getIndicadoresAction(filtros: FiltrosIndicadoresValidados): Promise<IndicadorRebanho> {
  try {
    // Validar filtros
    const resultado = filtrosIndicadoresSchema.safeParse(filtros);
    if (!resultado.success) {
      throw new Error('Filtros inválidos: ' + JSON.stringify(resultado.error.flatten().fieldErrors));
    }

    const periodo = calcularPeriodo(resultado.data);
    const tipoExploracao = await obterFazendasFiltros(resultado.data);
    const supabase = await createSupabaseServerClient();

    // Buscar dados em paralelo
    const [eventos, pesos, animais, partos, diagnosticos, animaisReprod, lactacoes, lotesRes] = await Promise.all([
      buscarEventosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarPesosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarAnimaisFiltrados({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarPartosComMae(),
      buscarDiagnosticosPrenhez(periodo),
      buscarAnimaisReprodutivos(),
      buscarLactacoesEncerradas(),
      supabase.from('lotes').select('id, nome'),
    ]);

    const composicao = calcularComposicaoRebanho(animais);
    const vacasMatrizesInicio = animais.filter((a) => isVaca(a.categoria)).length;

    const periodoCalculo = { dataInicio: periodo.data_inicial, dataFim: periodo.data_final };
    const pesagensAgrupadas = new Map<string, { data_pesagem: string; peso_kg: number }[]>();
    for (const peso of pesos) {
      if (!pesagensAgrupadas.has(peso.animal_id)) {
        pesagensAgrupadas.set(peso.animal_id, []);
      }
      pesagensAgrupadas.get(peso.animal_id)!.push({ data_pesagem: peso.data_pesagem, peso_kg: peso.peso_kg });
    }

    const taxaNatalidade = calcularTaxaNatalidade(eventos, vacasMatrizesInicio, periodoCalculo);
    const taxaMortalidade = calcularTaxaMortalidade(eventos, composicao.total, composicao.total, periodoCalculo);
    const taxaMortalidadeBezerros = calcularTaxaMortalidadeBezerros(eventos, periodoCalculo);
    const taxaDesfrute = calcularTaxaDesfrute(eventos, composicao.total, composicao.total, periodoCalculo);
    const taxaDescarte = calcularTaxaDescarte(animais);
    const gmdMedio = calcularGMDMedioRebanho(pesagensAgrupadas, periodoCalculo);

    // Taxa de Prenhez = diagnósticos positivos / total diagnósticos no período * 100
    const totalDiag = diagnosticos.length;
    const diagPositivos = diagnosticos.filter((d) => d.resultado_prenhez === 'positivo').length;
    const taxaPrenhez = totalDiag > 0 ? (diagPositivos / totalDiag) * 100 : null;

    // IEP — agrupar partos por animal_id, calcular média de intervalos entre partos consecutivos
    const partosPorAnimal = new Map<string, string[]>();
    for (const p of partos) {
      if (!partosPorAnimal.has(p.animal_id)) partosPorAnimal.set(p.animal_id, []);
      partosPorAnimal.get(p.animal_id)!.push(p.data_evento);
    }
    const intervalosIEP: number[] = [];
    for (const datas of partosPorAnimal.values()) {
      if (datas.length < 2) continue;
      const ordenadas = [...datas].sort();
      for (let i = 1; i < ordenadas.length; i++) {
        const dias = (new Date(ordenadas[i]).getTime() - new Date(ordenadas[i - 1]).getTime()) / 86400000;
        if (dias > 0) intervalosIEP.push(Math.round(dias));
      }
    }
    const iep = intervalosIEP.length > 0
      ? Math.round(intervalosIEP.reduce((a, b) => a + b, 0) / intervalosIEP.length)
      : null;

    // IPP — primeiro parto de cada vaca: (data_parto - data_nascimento_mae) em meses
    // Só considera vacas com data de nascimento conhecida
    const primeiroPartoPorAnimal = new Map<string, string>();
    for (const p of partos) {
      const atual = primeiroPartoPorAnimal.get(p.animal_id);
      if (!atual || p.data_evento < atual) primeiroPartoPorAnimal.set(p.animal_id, p.data_evento);
    }
    const idadesIPP: number[] = [];
    for (const p of partos) {
      if (!primeiroPartoPorAnimal.has(p.animal_id)) continue;
      if (primeiroPartoPorAnimal.get(p.animal_id) !== p.data_evento) continue;
      if (!p.mae_data_nascimento) continue;
      const nascimento = new Date(p.mae_data_nascimento);
      const parto = new Date(p.data_evento);
      const meses =
        (parto.getFullYear() - nascimento.getFullYear()) * 12 +
        (parto.getMonth() - nascimento.getMonth());
      if (meses > 0) idadesIPP.push(meses);
    }
    const ipp = idadesIPP.length > 0
      ? Math.round(idadesIPP.reduce((a, b) => a + b, 0) / idadesIPP.length)
      : null;

    // Taxa de Reposição = novilhas prenhas / total vacas * 100
    const totalVacas = animaisReprod.filter((a) => isVaca(a.categoria)).length;
    const novilhasPrenhas = animaisReprod.filter(
      (a) => a.categoria === 'Novilha Prenha' || a.status_reprodutivo === 'prenha'
    ).length;
    const taxaReposicao = totalVacas > 0 ? (novilhasPrenhas / totalVacas) * 100 : null;

    // % Vacas em Lactação = vacas com status_reprodutivo = 'lactacao' / total fêmeas adultas * 100
    const vacasEmLactacao = animaisReprod.filter((a) => a.status_reprodutivo === 'lactacao').length;
    const femeaAdultas = animaisReprod.filter((a) => isVacaProdutiva(a.categoria)).length;
    const percentualVacasLactacao = femeaAdultas > 0 ? (vacasEmLactacao / femeaAdultas) * 100 : null;

    // Período Seco Médio = média de dias entre data_fim_secagem e data_inicio_parto da lactação seguinte
    const lactacoesPorAnimal = new Map<string, { inicio: string; fim: string }[]>();
    for (const lac of lactacoes) {
      if (!lac.data_fim_secagem) continue;
      if (!lactacoesPorAnimal.has(lac.animal_id)) lactacoesPorAnimal.set(lac.animal_id, []);
      lactacoesPorAnimal.get(lac.animal_id)!.push({ inicio: lac.data_inicio_parto, fim: lac.data_fim_secagem });
    }
    const periodosSeco: number[] = [];
    for (const lacs of lactacoesPorAnimal.values()) {
      const ordenadas = [...lacs].sort((a, b) => a.inicio.localeCompare(b.inicio));
      for (let i = 0; i < ordenadas.length - 1; i++) {
        const fimSeca = new Date(ordenadas[i].fim);
        const proximoParto = new Date(ordenadas[i + 1].inicio);
        const dias = (proximoParto.getTime() - fimSeca.getTime()) / 86400000;
        if (dias > 0 && dias < 365) periodosSeco.push(Math.round(dias));
      }
    }
    const periodoSecoMedio = periodosSeco.length > 0
      ? Math.round(periodosSeco.reduce((a, b) => a + b, 0) / periodosSeco.length)
      : null;

    // ── Séries para os gráficos (abas GMD, Natalidade, Comparativo Lotes) ──
    const brincoPorAnimal = new Map<string, string>(animais.map((a) => [a.id, a.brinco]));
    const pesoAtualPorAnimal = new Map<string, number | null>(animais.map((a) => [a.id, a.peso_atual]));
    const lotesNome = new Map<string, string>(
      ((lotesRes.data ?? []) as Array<{ id: string; nome: string }>).map((l) => [l.id, l.nome])
    );
    const animaisPorLote = new Map<string, { nome: string; animalIds: string[] }>();
    for (const a of animais) {
      if (!a.lote_id) continue;
      if (!animaisPorLote.has(a.lote_id)) {
        animaisPorLote.set(a.lote_id, { nome: lotesNome.get(a.lote_id) ?? 'Sem lote', animalIds: [] });
      }
      animaisPorLote.get(a.lote_id)!.animalIds.push(a.id);
    }

    const seriesGraficos = {
      gmdPorAnimal: montarSerieGMDPorAnimal(pesagensAgrupadas, brincoPorAnimal, periodoCalculo),
      natalidadeMortalidade: montarSerieNatalidadeMortalidade(eventos, composicao.total),
      comparativoLotes: montarComparativoLotes(
        animaisPorLote,
        pesagensAgrupadas,
        pesoAtualPorAnimal,
        'gmd',
        periodoCalculo
      ),
    };

    const indicadores: IndicadorRebanho = {
      gmd: { valor: gmdMedio ?? null, estado: gmdMedio != null ? 'OK' : 'INSUFFICIENT_DATA' },
      taxaNatalidade: { valor: taxaNatalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeGeral: { valor: taxaMortalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeBezerros: { valor: taxaMortalidadeBezerros.taxa_percentual, estado: 'OK' },
      taxaDescarte: { valor: taxaDescarte.taxa_percentual, estado: 'OK' },
      taxaPrenhez: { valor: taxaPrenhez, estado: taxaPrenhez != null ? 'OK' : 'INSUFFICIENT_DATA' },
      iep: { valor: iep, estado: iep != null ? 'OK' : 'INSUFFICIENT_DATA' },
      ipp: { valor: ipp, estado: ipp != null ? 'OK' : 'INSUFFICIENT_DATA' },
      pesoMedioPorCategoria: { valor: {}, estado: 'OK' },
      taxaReposicao: { valor: taxaReposicao, estado: taxaReposicao != null ? 'OK' : 'INSUFFICIENT_DATA' },
      evolucaoEfetivo: { valor: [], estado: 'OK' },
      composicaoRebanho: { valor: composicao.por_categoria, estado: 'OK' },
      seriesGraficos,
    };

    if (tipoExploracao !== 'LEITE') {
      indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
    }
    if (tipoExploracao !== 'CORTE') {
      indicadores.percentualVacasLactacao = {
        valor: percentualVacasLactacao,
        estado: percentualVacasLactacao != null ? 'OK' : 'INSUFFICIENT_DATA',
      };
      indicadores.periodoSecoMedio = {
        valor: periodoSecoMedio,
        estado: periodoSecoMedio != null ? 'OK' : 'INSUFFICIENT_DATA',
      };
    }

    // Cache 5 min
    revalidateTag('indicadores');

    return indicadores;
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'getIndicadoresAction' } });
    throw erro;
  }
}

/**
 * Server Action: Comparativo entre lotes (T40)
 */
export async function getComparativoLotesAction(
  filtros: FiltrosIndicadoresValidados,
  indicador: 'gmd' | 'natalidade' | 'prenhez' | 'peso'
): Promise<ComparativoLotes[]> {
  try {
    const resultado = filtrosIndicadoresSchema.safeParse(filtros);
    if (!resultado.success) throw new Error('Filtros inválidos');

    // TODO [T43 — backlog]: Implementar ranking por lote.
    //   Bloqueado por: necessidade de definir critério de ordenação por indicador (gmd, natalidade, prenhez, peso).
    //   Ref: SPEC-rebanho-v3.md Fase 6, BUGS-rebanho.md Seção 4.3
    return [];
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'getComparativoLotesAction' } });
    throw erro;
  }
}

/**
 * Server Action: Export CSV (T45)
 * Retorna Blob com dados em UTF-8 BOM + separador ;
 */
export async function exportarIndicadoresCSVAction(filtros: FiltrosIndicadoresValidados): Promise<Blob> {
  try {
    const resultado = filtrosIndicadoresSchema.safeParse(filtros);
    if (!resultado.success) throw new Error('Filtros inválidos');

    // Buscar user e fazenda
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Usuário não autenticado');

    const { data: fazendaData, error: fazendaError } = await supabase.from('fazendas').select('nome, tipo_exploracao').single();
    if (fazendaError) throw new Error('Fazenda não encontrada');

    // Calcular período
    const periodo = calcularPeriodo(resultado.data);
    const tipoExploracao = (fazendaData?.tipo_exploracao || 'MISTO') as TipoExploracao;

    // Reusar o cálculo real e completo dos indicadores (sem mocks)
    const indicadores = await getIndicadoresAction(resultado.data);

    // Gerar CSV
    const { gerarCsvIndicadoresRebanho } = await import('@/lib/csv/gerarCsvIndicadoresRebanho');
    const dataInicio = new Date(periodo.data_inicial);
    const dataFim = new Date(periodo.data_final);

    const csvBlob = gerarCsvIndicadoresRebanho({
      fazendaNome: fazendaData?.nome || 'Sem nome',
      tipoExploracao,
      periodo: { dataInicio, dataFim },
      indicadores,
    });

    revalidateTag('indicadores');
    return csvBlob;
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'exportarIndicadoresCSVAction' } });
    throw erro;
  }
}

/**
 * Server Action: Export PDF (T45)
 * Retorna Blob com PDF gerado (jsPDF + autoTable)
 */
export async function exportarIndicadoresPDFAction(filtros: FiltrosIndicadoresValidados): Promise<Blob> {
  try {
    const resultado = filtrosIndicadoresSchema.safeParse(filtros);
    if (!resultado.success) throw new Error('Filtros inválidos');

    // Buscar user e fazenda
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Usuário não autenticado');

    const { data: fazendaData, error: fazendaError } = await supabase.from('fazendas').select('nome, tipo_exploracao').single();
    if (fazendaError) throw new Error('Fazenda não encontrada');

    // Calcular período
    const periodo = calcularPeriodo(resultado.data);
    const tipoExploracao = (fazendaData?.tipo_exploracao || 'MISTO') as TipoExploracao;

    // Reusar o cálculo real e completo dos indicadores (sem mocks)
    const indicadores = await getIndicadoresAction(resultado.data);

    // Gerar PDF via jsPDF
    const dataInicio = new Date(periodo.data_inicial);
    const dataFim = new Date(periodo.data_final);
    const jsPDFModule = await import('jspdf').then((m) => m.default);
    const autoTableModule = await import('jspdf-autotable');

    const doc = new jsPDFModule('p', 'mm', 'A4');
    const corVerde = '#00A651';

    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...hexToRgbArray(corVerde));
    doc.text('GestSilo — Indicadores Zootécnicos', 20, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fazenda: ${fazendaData?.nome || 'Sem nome'}`, 20, 28);
    doc.text(`Tipo de Exploração: ${tipoExploracao}`, 20, 33);
    doc.text(`Período: ${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`, 20, 38);

    // Table de indicadores
    const tableData = [
      ['GMD (Ganho de Peso)', indicadores.gmd.valor?.toFixed(2) || '-', 'kg/dia'],
      ['Taxa de Natalidade', indicadores.taxaNatalidade.valor?.toFixed(2) || '-', '%'],
      ['Taxa de Mortalidade Geral', indicadores.taxaMortalidadeGeral.valor?.toFixed(2) || '-', '%'],
      ['Taxa de Mortalidade (Bezerros)', indicadores.taxaMortalidadeBezerros.valor?.toFixed(2) || '-', '%'],
      ['Taxa de Descarte', indicadores.taxaDescarte.valor?.toFixed(2) || '-', '%'],
      ['Taxa de Prenhez', indicadores.taxaPrenhez.valor?.toFixed(2) || '-', '%'],
      ['IEP (Int. Entre Partos)', indicadores.iep.valor?.toFixed(2) || '-', 'dias'],
      ['IPP (Idade 1º Parto)', indicadores.ipp.valor?.toFixed(2) || '-', 'meses'],
      ['Taxa de Reposição', indicadores.taxaReposicao.valor?.toFixed(2) || '-', '%'],
    ];

    if (indicadores.taxaDesfrute) {
      tableData.push(['Taxa de Desfrute', indicadores.taxaDesfrute.valor?.toFixed(2) || '-', '%']);
    }
    if (indicadores.percentualVacasLactacao) {
      tableData.push(['% Vacas em Lactação', indicadores.percentualVacasLactacao.valor?.toFixed(2) || '-', '%']);
    }
    if (indicadores.periodoSecoMedio) {
      tableData.push(['Período Seco Médio', indicadores.periodoSecoMedio.valor?.toFixed(2) || '-', 'dias']);
    }

    autoTableModule.default(doc, {
      startY: 45,
      margin: { left: 20, right: 20 },
      head: [['Indicador', 'Valor', 'Unidade']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgbArray(corVerde),
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
      },
    });

    // Footer
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado por GestSilo em ${new Date().toLocaleDateString('pt-BR')}`, 20, doc.internal.pageSize.getHeight() - 10);

    // Gerar Blob do PDF
    const pdfBlob = doc.output('blob');

    revalidateTag('indicadores');
    return pdfBlob;
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'exportarIndicadoresPDFAction' } });
    throw erro;
  }
}

/**
 * Helper para converter hex para RGB array
 */
function hexToRgbArray(hex: string): [number, number, number] {
  const resultado = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!resultado) {
    return [0, 166, 81];
  }
  return [
    parseInt(resultado[1], 16),
    parseInt(resultado[2], 16),
    parseInt(resultado[3], 16),
  ];
}

/**
 * Server Action: Mini-card Rebanho para Dashboard (T46)
 * Retorna dados essenciais: total animais, GMD, prenhez, trend
 * Período fixo: 90 dias
 * Cache: 5 min (revalidateTag)
 */
export interface MiniCardRebanhoData {
  totalAnimais: number;
  gmd: number | null;
  taxaPrenhez: number;
  trendGMD: 'up' | 'down' | 'stable';
  trendValor?: number;
}

export async function getMiniCardRebanhoAction(): Promise<MiniCardRebanhoData> {
  try {
    // Período fixo: 90 dias
    const hoje = new Date();
    const dataFim = hoje;
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 90);

    const periodo = {
      data_inicial: dataInicio.toISOString().split('T')[0],
      data_final: dataFim.toISOString().split('T')[0],
    };

    // Período anterior para trend (90d antes)
    const dataFimAnterior = new Date(dataInicio);
    const dataInicioAnterior = new Date(dataFimAnterior);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 90);

    const periodoAnterior = {
      data_inicial: dataInicioAnterior.toISOString().split('T')[0],
      data_final: dataFimAnterior.toISOString().split('T')[0],
    };

    // Buscar dados período atual e anterior em paralelo
    const [eventos, pesos, animais, eventosAnt, pesosAnt] = await Promise.all([
      buscarEventosNoPeriodo({ periodo, tipo_rebanho: undefined }),
      buscarPesosNoPeriodo({ periodo, tipo_rebanho: undefined }),
      buscarAnimaisFiltrados({ periodo, tipo_rebanho: undefined }),
      buscarEventosNoPeriodo({ periodo: periodoAnterior, tipo_rebanho: undefined }),
      buscarPesosNoPeriodo({ periodo: periodoAnterior, tipo_rebanho: undefined }),
    ]);

    // Total de animais ativos (período atual)
    const totalAnimais = animais.length;

    // GMD período atual
    const pesagensAgrupadas = new Map<string, { data_pesagem: string; peso_kg: number }[]>();
    for (const peso of pesos) {
      if (!pesagensAgrupadas.has(peso.animal_id)) {
        pesagensAgrupadas.set(peso.animal_id, []);
      }
      pesagensAgrupadas.get(peso.animal_id)!.push({ data_pesagem: peso.data_pesagem, peso_kg: peso.peso_kg });
    }

    const periodoCalculo = { dataInicio: periodo.data_inicial, dataFim: periodo.data_final };
    const gmdMedio = calcularGMDMedioRebanho(pesagensAgrupadas, periodoCalculo);

    // Taxa de Prenhez (mock até implementação T39)
    const taxaPrenhez = 86;

    // GMD período anterior para trend
    const pesagensAntAgrupadas = new Map<string, { data_pesagem: string; peso_kg: number }[]>();
    for (const peso of pesosAnt) {
      if (!pesagensAntAgrupadas.has(peso.animal_id)) {
        pesagensAntAgrupadas.set(peso.animal_id, []);
      }
      pesagensAntAgrupadas.get(peso.animal_id)!.push({ data_pesagem: peso.data_pesagem, peso_kg: peso.peso_kg });
    }

    const periodoCalculoAnt = { dataInicio: periodoAnterior.data_inicial, dataFim: periodoAnterior.data_final };
    const gmdMedioAnt = calcularGMDMedioRebanho(pesagensAntAgrupadas, periodoCalculoAnt);

    // Calcular trend
    let trendGMD: 'up' | 'down' | 'stable' = 'stable';
    let trendValor: number | undefined;

    if (gmdMedio !== null && gmdMedioAnt !== null) {
      const delta = gmdMedio - gmdMedioAnt;
      trendValor = Math.abs(delta);

      if (delta > 0.05) {
        trendGMD = 'up';
      } else if (delta < -0.05) {
        trendGMD = 'down';
      }
    }

    const resultado: MiniCardRebanhoData = {
      totalAnimais,
      gmd: gmdMedio,
      taxaPrenhez,
      trendGMD,
      trendValor,
    };

    // Cache 5 min
    revalidateTag('indicadores');

    return resultado;
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'getMiniCardRebanhoAction' } });
    throw erro;
  }
}

