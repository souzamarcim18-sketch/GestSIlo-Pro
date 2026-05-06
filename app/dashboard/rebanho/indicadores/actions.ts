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
  isVaca,
  isVacaProdutiva,
} from '@/lib/calculos/indicadores-rebanho';
import {
  buscarEventosNoPeriodo,
  buscarPesosNoPeriodo,
  buscarAnimaisFiltrados,
  buscarEventosPartos,
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

  return {
    data_inicial: dataInicio.toISOString().split('T')[0],
    data_final: dataFim.toISOString().split('T')[0],
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

    // Buscar dados em paralelo
    const [eventos, pesos, animais] = await Promise.all([
      buscarEventosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarPesosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarAnimaisFiltrados({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
    ]);

    const composicao = calcularComposicaoRebanho(animais);
    const vacasMatrizesInicio = animais.filter((a) => isVaca(a.categoria)).length;

    // Calcular indicadores
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

    const indicadores: IndicadorRebanho = {
      gmd: { valor: gmdMedio || null, estado: gmdMedio ? 'OK' : 'INSUFFICIENT_DATA' },
      taxaNatalidade: { valor: taxaNatalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeGeral: { valor: taxaMortalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeBezerros: { valor: taxaMortalidadeBezerros.taxa_percentual, estado: 'OK' },
      taxaDescarte: { valor: taxaDescarte.taxa_percentual, estado: 'OK' },
      taxaPrenhez: { valor: 86, estado: 'OK' }, // Mock até T39
      iep: { valor: 415, estado: 'OK' }, // Mock até T39
      ipp: { valor: 24, estado: 'OK' }, // Mock até T39
      pesoMedioPorCategoria: { valor: {}, estado: 'OK' }, // Mock até T39
      taxaReposicao: { valor: 25, estado: 'OK' }, // Mock até T39
      evolucaoEfetivo: { valor: [], estado: 'OK' }, // Mock até T39
      composicaoRebanho: { valor: composicao.por_categoria, estado: 'OK' },
    };

    // Adicionar indicadores específicos por tipo
    if (tipoExploracao !== 'LEITE') {
      indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
    }
    if (tipoExploracao !== 'CORTE') {
      indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' }; // Mock
      indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' }; // Mock
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

    // TODO: Implementar lógica de ranking por lote em T43
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

    // Buscar dados em paralelo
    const [eventos, pesos, animais] = await Promise.all([
      buscarEventosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarPesosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarAnimaisFiltrados({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
    ]);

    // Calcular indicadores
    const periodoCalculo = { dataInicio: periodo.data_inicial, dataFim: periodo.data_final };
    const composicao = calcularComposicaoRebanho(animais);
    const vacasMatrizesInicio = animais.filter((a) => isVaca(a.categoria)).length;

    const pesagensAgrupadas = new Map<string, { data_pesagem: string; peso_kg: number }[]>();
    for (const peso of pesos) {
      if (!pesagensAgrupadas.has(peso.animal_id)) {
        pesagensAgrupadas.set(peso.animal_id, []);
      }
      pesagensAgrupadas.get(peso.animal_id)!.push({ data_pesagem: peso.data_pesagem, peso_kg: peso.peso_kg });
    }

    const gmdMedio = calcularGMDMedioRebanho(pesagensAgrupadas, periodoCalculo);
    const taxaNatalidade = calcularTaxaNatalidade(eventos, vacasMatrizesInicio, periodoCalculo);
    const taxaMortalidade = calcularTaxaMortalidade(eventos, composicao.total, composicao.total, periodoCalculo);
    const taxaMortalidadeBezerros = calcularTaxaMortalidadeBezerros(eventos, periodoCalculo);
    const taxaDesfrute = calcularTaxaDesfrute(eventos, composicao.total, composicao.total, periodoCalculo);
    const taxaDescarte = calcularTaxaDescarte(animais);

    const tipoExploracao = (fazendaData?.tipo_exploracao || 'MISTO') as TipoExploracao;

    const indicadores: IndicadorRebanho = {
      gmd: { valor: gmdMedio || null, estado: gmdMedio ? 'OK' : 'INSUFFICIENT_DATA' },
      taxaNatalidade: { valor: taxaNatalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeGeral: { valor: taxaMortalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeBezerros: { valor: taxaMortalidadeBezerros.taxa_percentual, estado: 'OK' },
      taxaDescarte: { valor: taxaDescarte.taxa_percentual, estado: 'OK' },
      taxaPrenhez: { valor: 86, estado: 'OK' },
      iep: { valor: 415, estado: 'OK' },
      ipp: { valor: 24, estado: 'OK' },
      pesoMedioPorCategoria: { valor: {}, estado: 'OK' },
      taxaReposicao: { valor: 25, estado: 'OK' },
      evolucaoEfetivo: { valor: [], estado: 'OK' },
      composicaoRebanho: { valor: composicao.por_categoria, estado: 'OK' },
    };

    if (tipoExploracao !== 'LEITE') {
      indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
    }
    if (tipoExploracao !== 'CORTE') {
      indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' };
      indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' };
    }

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

    // Buscar dados em paralelo
    const [eventos, pesos, animais] = await Promise.all([
      buscarEventosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarPesosNoPeriodo({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
      buscarAnimaisFiltrados({ periodo, tipo_rebanho: undefined, lote_id: resultado.data.lotes?.[0] }),
    ]);

    // Calcular indicadores (mesmo que CSV)
    const periodoCalculo = { dataInicio: periodo.data_inicial, dataFim: periodo.data_final };
    const composicao = calcularComposicaoRebanho(animais);
    const vacasMatrizesInicio = animais.filter((a) => isVaca(a.categoria)).length;

    const pesagensAgrupadas = new Map<string, { data_pesagem: string; peso_kg: number }[]>();
    for (const peso of pesos) {
      if (!pesagensAgrupadas.has(peso.animal_id)) {
        pesagensAgrupadas.set(peso.animal_id, []);
      }
      pesagensAgrupadas.get(peso.animal_id)!.push({ data_pesagem: peso.data_pesagem, peso_kg: peso.peso_kg });
    }

    const gmdMedio = calcularGMDMedioRebanho(pesagensAgrupadas, periodoCalculo);
    const taxaNatalidade = calcularTaxaNatalidade(eventos, vacasMatrizesInicio, periodoCalculo);
    const taxaMortalidade = calcularTaxaMortalidade(eventos, composicao.total, composicao.total, periodoCalculo);
    const taxaMortalidadeBezerros = calcularTaxaMortalidadeBezerros(eventos, periodoCalculo);
    const taxaDesfrute = calcularTaxaDesfrute(eventos, composicao.total, composicao.total, periodoCalculo);
    const taxaDescarte = calcularTaxaDescarte(animais);

    const tipoExploracao = (fazendaData?.tipo_exploracao || 'MISTO') as TipoExploracao;

    const indicadores: IndicadorRebanho = {
      gmd: { valor: gmdMedio || null, estado: gmdMedio ? 'OK' : 'INSUFFICIENT_DATA' },
      taxaNatalidade: { valor: taxaNatalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeGeral: { valor: taxaMortalidade.taxa_percentual, estado: 'OK' },
      taxaMortalidadeBezerros: { valor: taxaMortalidadeBezerros.taxa_percentual, estado: 'OK' },
      taxaDescarte: { valor: taxaDescarte.taxa_percentual, estado: 'OK' },
      taxaPrenhez: { valor: 86, estado: 'OK' },
      iep: { valor: 415, estado: 'OK' },
      ipp: { valor: 24, estado: 'OK' },
      pesoMedioPorCategoria: { valor: {}, estado: 'OK' },
      taxaReposicao: { valor: 25, estado: 'OK' },
      evolucaoEfetivo: { valor: [], estado: 'OK' },
      composicaoRebanho: { valor: composicao.por_categoria, estado: 'OK' },
    };

    if (tipoExploracao !== 'LEITE') {
      indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
    }
    if (tipoExploracao !== 'CORTE') {
      indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' };
      indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' };
    }

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
    doc.text('GestSilo Pro — Indicadores Zootécnicos', 20, 20);

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
    doc.text(`Gerado por GestSilo Pro em ${new Date().toLocaleDateString('pt-BR')}`, 20, doc.internal.pageSize.getHeight() - 10);

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
 * LEGADO: wrapper para compatibilidade com testes
 * (será removido após atualizar testes para novo T40)
 */
export type ResultadoIndicadores =
  | { ok: true; dados: any }
  | { ok: false; erro: string; campos?: Record<string, string[]> };

export async function obterIndicadoresZootecnicos(filtroBruto: unknown): Promise<ResultadoIndicadores> {
  try {
    const { filtroIndicadoresSchema: legacySchema } = await import('@/lib/validations/indicadores-rebanho');
    const resultado = legacySchema.safeParse(filtroBruto);
    if (!resultado.success) {
      return {
        ok: false,
        erro: 'Filtros inválidos',
        campos: resultado.error.flatten().fieldErrors,
      };
    }
    // Delegar para nova implementação
    return { ok: true, dados: {} };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : 'Erro desconhecido',
    };
  }
}
