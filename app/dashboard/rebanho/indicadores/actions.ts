'use server';

import * as Sentry from '@sentry/nextjs';
import { filtroIndicadoresSchema, respostaIndicadoresSchema, type FiltroIndicadores, type RespostaIndicadores } from '@/lib/validations/indicadores-rebanho';
import {
  calcularComposicaoRebanho,
  calcularTaxaNatalidade,
  calcularTaxaMortalidade,
  calcularTaxaMortalidadeBezerros,
  calcularTaxaDesfrute,
  calcularTaxaDescarte,
  calcularGMDMedioRebanho,
  isBezerro,
  isVaca,
  isVacaProdutiva,
} from '@/lib/calculos/indicadores-rebanho';
import {
  buscarEventosNoPeriodo,
  buscarPesosNoPeriodo,
  buscarAnimaisFiltrados,
  buscarEventosPartos,
} from '@/lib/supabase/rebanho-indicadores';

export type ResultadoIndicadores =
  | { ok: true; dados: RespostaIndicadores }
  | { ok: false; erro: string; campos?: Record<string, string[]> };

/**
 * Server Action principal para cálculo de indicadores zootécnicos
 * 1. Valida filtro com Zod
 * 2. Busca dados em paralelo (Promise.all)
 * 3. Calcula indicadores puros
 * 4. Valida output com Zod
 * 5. Retorna discriminated union type-safe
 * 6. Captura erros em Sentry
 */
export async function obterIndicadoresZootecnicos(
  filtroBruto: unknown
): Promise<ResultadoIndicadores> {
  try {
    // 1. Validar filtro
    const resultado = filtroIndicadoresSchema.safeParse(filtroBruto);
    if (!resultado.success) {
      return {
        ok: false,
        erro: 'Filtros inválidos',
        campos: resultado.error.flatten().fieldErrors,
      };
    }
    const filtro = resultado.data;

    // 2. Buscar dados em paralelo
    const [eventos, pesos, animais, eventosPartos] = await Promise.all([
      buscarEventosNoPeriodo(filtro),
      buscarPesosNoPeriodo(filtro),
      buscarAnimaisFiltrados(filtro),
      buscarEventosPartos(),
    ]);

    // Snapshot atual (sem período)
    const composicao = calcularComposicaoRebanho(animais);

    // Contar vacas matrizes (produtivas) no início do período
    const vacasMatrizesInicio = animais.filter((a) =>
      filtro.tipo_rebanho === 'leiteiro'
        ? isVacaProdutiva(a.categoria)
        : isVaca(a.categoria)
    ).length;

    // 3. Calcular indicadores
    const periodoCalculo = {
      dataInicio: filtro.periodo.data_inicial,
      dataFim: filtro.periodo.data_final,
    };

    const taxaNatalidade = calcularTaxaNatalidade(
      eventos,
      vacasMatrizesInicio,
      periodoCalculo
    );

    const taxaMortalidade = calcularTaxaMortalidade(
      eventos,
      composicao.total,
      composicao.total,
      periodoCalculo
    );

    const taxaMortalidadeBezerros = calcularTaxaMortalidadeBezerros(
      eventos,
      periodoCalculo
    );

    const taxaDesfrute = calcularTaxaDesfrute(
      eventos,
      composicao.total,
      composicao.total,
      periodoCalculo
    );

    const taxaDescarte = calcularTaxaDescarte(animais);

    // GMD médio do período
    const pesagensAgrupadas = new Map<
      string,
      { data_pesagem: string; peso_kg: number }[]
    >();
    for (const peso of pesos) {
      if (!pesagensAgrupadas.has(peso.animal_id)) {
        pesagensAgrupadas.set(peso.animal_id, []);
      }
      pesagensAgrupadas.get(peso.animal_id)!.push({
        data_pesagem: peso.data_pesagem,
        peso_kg: peso.peso_kg,
      });
    }

    const gmdMedio = calcularGMDMedioRebanho(pesagensAgrupadas, periodoCalculo);

    // 4. Validar e retornar resposta
    const resposta: RespostaIndicadores = {
      composicao,
      taxa_natalidade: taxaNatalidade,
      taxa_mortalidade: taxaMortalidade,
      taxa_mortalidade_bezerros: taxaMortalidadeBezerros,
      taxa_desfrute: taxaDesfrute,
      taxa_descarte: taxaDescarte,
      gmd_medio: {
        gmd_medio: gmdMedio,
        animais_com_gmd: pesagensAgrupadas.size,
        animais_sem_dados: animais.length - pesagensAgrupadas.size,
      },
      periodo: filtro.periodo,
      gerado_em: new Date().toISOString(),
    };

    // Validar output
    const outputValidado = respostaIndicadoresSchema.parse(resposta);

    return {
      ok: true,
      dados: outputValidado,
    };
  } catch (erro) {
    // Capturar no Sentry
    Sentry.captureException(erro, {
      tags: {
        action: 'obterIndicadoresZootecnicos',
      },
    });

    // Mensagem genérica em português
    const mensagem =
      erro instanceof Error
        ? erro.message
        : 'Erro ao calcular indicadores. Tente novamente em instantes.';

    return {
      ok: false,
      erro: mensagem,
    };
  }
}
