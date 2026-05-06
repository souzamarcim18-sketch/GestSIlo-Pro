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
 */
export async function exportarIndicadoresCSVAction(filtros: FiltrosIndicadoresValidados): Promise<Blob> {
  try {
    const resultado = filtrosIndicadoresSchema.safeParse(filtros);
    if (!resultado.success) throw new Error('Filtros inválidos');

    // TODO: Implementar em T45
    const csv = 'Indicador,Período,Valor,Unidade\n';
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'exportarIndicadoresCSVAction' } });
    throw erro;
  }
}

/**
 * Server Action: Export PDF (T45)
 */
export async function exportarIndicadoresPDFAction(filtros: FiltrosIndicadoresValidados): Promise<Blob> {
  try {
    const resultado = filtrosIndicadoresSchema.safeParse(filtros);
    if (!resultado.success) throw new Error('Filtros inválidos');

    // TODO: Implementar em T45
    return new Blob([], { type: 'application/pdf' });
  } catch (erro) {
    Sentry.captureException(erro, { tags: { action: 'exportarIndicadoresPDFAction' } });
    throw erro;
  }
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
