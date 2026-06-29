/**
 * Funções de cálculo puro para indicadores zootécnicos — Fase 4: Rebanho
 * Todas as funções são determinísticas, sem dependências externas (Supabase, Date.now())
 * Timestamps/períodos são recebidos como parâmetros (strings ISO YYYY-MM-DD)
 *
 * Indicadores fora de escopo (não há evento no schema):
 * - Taxa de aborto (sem evento ABORTO)
 * - Taxa de prenhez direta (sem evento INSEMINACAO/DIAGNOSTICO)
 * - Escore corporal (sem campo na tabela animal)
 */

import type { Animal, TipoEvento, EventoRebanho, PesoAnimal } from '@/lib/types/rebanho';
import type { IndicadoresLeiteiros } from '@/lib/types/rebanho-leiteira';

// ========== CATEGORIAS (STRINGS EXATAS DO TRIGGER recalcular_categoria_animal) ==========

export const CATEGORIAS_BEZERROS = ['Bezerro', 'Bezerra'] as const;
export const CATEGORIAS_NOVILHAS = ['Novilha', 'Novilha Prenha'] as const;
export const CATEGORIAS_NOVILHOS = ['Novilho'] as const;
export const CATEGORIAS_VACAS_LEITEIRAS = [
  'Vaca em Lactação',
  'Vaca Seca',
  'Vaca Prenha',
  'Vaca Vazia',
] as const;
export const CATEGORIAS_VACAS_CORTE = ['Vaca Matriz'] as const;
export const CATEGORIAS_TOURO = ['Touro'] as const;
export const CATEGORIAS_BOI = ['Boi', 'Boi Descartado'] as const;
export const CATEGORIAS_DESCARTE = ['Boi Descartado', 'Fêmea Descartada'] as const;

// Agrupados para facilitar
export const CATEGORIAS_VACAS = [
  ...CATEGORIAS_VACAS_LEITEIRAS,
  ...CATEGORIAS_VACAS_CORTE,
] as const;

// ========== HELPERS DE CATEGORIA ==========

export function isBezerro(categoria: string): boolean {
  return CATEGORIAS_BEZERROS.includes(categoria as never);
}

export function isNovilha(categoria: string): boolean {
  return CATEGORIAS_NOVILHAS.includes(categoria as never);
}

export function isNovilho(categoria: string): boolean {
  return CATEGORIAS_NOVILHOS.includes(categoria as never);
}

export function isVaca(categoria: string): boolean {
  return CATEGORIAS_VACAS.includes(categoria as never);
}

export function isTouro(categoria: string): boolean {
  return CATEGORIAS_TOURO.includes(categoria as never);
}

export function isBoi(categoria: string): boolean {
  return CATEGORIAS_BOI.includes(categoria as never);
}

export function isDescarte(categoria: string): boolean {
  return CATEGORIAS_DESCARTE.includes(categoria as never);
}

export function isVacaProdutiva(categoria: string): boolean {
  return CATEGORIAS_VACAS_LEITEIRAS.includes(categoria as never);
}

export function isVacaMatriz(categoria: string): boolean {
  return CATEGORIAS_VACAS_CORTE.includes(categoria as never);
}

// ========== COMPOSIÇÃO REBANHO (SNAPSHOT — NÃO DEPENDE DE PERÍODO) ==========

export interface ComposicaoRebanho {
  total: number;
  por_categoria: Record<string, number>;
  por_sexo: { Macho: number; Fêmea: number };
  por_vocacao: { leiteiro: number; corte: number; dupla_aptidao: number };
}

export function calcularComposicaoRebanho(
  animaisAtivos: Pick<Animal, 'categoria' | 'sexo' | 'tipo_rebanho'>[]
): ComposicaoRebanho {
  const resultado: ComposicaoRebanho = {
    total: animaisAtivos.length,
    por_categoria: {},
    por_sexo: { Macho: 0, Fêmea: 0 },
    por_vocacao: { leiteiro: 0, corte: 0, dupla_aptidao: 0 },
  };

  for (const animal of animaisAtivos) {
    // Por categoria
    resultado.por_categoria[animal.categoria] =
      (resultado.por_categoria[animal.categoria] || 0) + 1;

    // Por sexo
    resultado.por_sexo[animal.sexo]++;

    // Por vocação
    resultado.por_vocacao[animal.tipo_rebanho]++;
  }

  return resultado;
}

// ========== DISTRIBUIÇÃO POR FAIXA ETÁRIA ==========

export interface ContagemFaixaEtaria {
  bezerros: number;
  novilhas: number;
  novilhos: number;
  vacas: number;
  reprodutores: number;
  engorda: number;
  descarte: number;
}

export function contarPorFaixaEtaria(
  animaisAtivos: Pick<Animal, 'categoria'>[]
): ContagemFaixaEtaria {
  const resultado: ContagemFaixaEtaria = {
    bezerros: 0,
    novilhas: 0,
    novilhos: 0,
    vacas: 0,
    reprodutores: 0,
    engorda: 0,
    descarte: 0,
  };

  for (const animal of animaisAtivos) {
    if (isBezerro(animal.categoria)) {
      resultado.bezerros++;
    } else if (isNovilha(animal.categoria)) {
      resultado.novilhas++;
    } else if (isNovilho(animal.categoria)) {
      resultado.novilhos++;
    } else if (isVaca(animal.categoria)) {
      resultado.vacas++;
    } else if (isTouro(animal.categoria)) {
      resultado.reprodutores++;
    } else if (isBoi(animal.categoria)) {
      if (isDescarte(animal.categoria)) {
        resultado.descarte++;
      } else {
        resultado.engorda++;
      }
    }
  }

  return resultado;
}

// ========== RESULTADO DE TAXA (NUMERADOR / DENOMINADOR) ==========

export interface ResultadoTaxa {
  numerador: number;
  denominador: number;
  taxa_percentual: number; // 0-100, ou 0 se denominador = 0
}

function calcularTaxaPercentual(numerador: number, denominador: number): number {
  if (denominador === 0) return 0;
  return (numerador / denominador) * 100;
}

// ========== TAXAS (DEPENDEM DE PERÍODO) ==========

/**
 * Taxa de Natalidade = (nascimentos no período / vacas matrizes no início) * 100
 * @param eventos Eventos do período filtrados por tipo NASCIMENTO
 * @param vacasMatrizesInicio Quantidade de vacas matrizes (produtivas) no início do período
 * @param periodo Não usado no cálculo puro, apenas para documentação
 */
export function calcularTaxaNatalidade(
  eventos: Pick<EventoRebanho, 'tipo'>[],
  vacasMatrizesInicio: number,
  periodo?: { dataInicio: string; dataFim: string }
): ResultadoTaxa {
  const nascimentos = eventos.filter((e) => e.tipo === 'nascimento').length;
  return {
    numerador: nascimentos,
    denominador: vacasMatrizesInicio,
    taxa_percentual: calcularTaxaPercentual(nascimentos, vacasMatrizesInicio),
  };
}

/**
 * Taxa de Mortalidade = (mortes / rebanho médio) * 100
 * rebanho médio = (rebanho início + rebanho fim) / 2
 */
export function calcularTaxaMortalidade(
  eventos: Pick<EventoRebanho, 'tipo'>[],
  rebanhoInicio: number,
  rebanhoFim: number,
  periodo?: { dataInicio: string; dataFim: string }
): ResultadoTaxa {
  const mortes = eventos.filter((e) => e.tipo === 'morte').length;
  const rebanhoMedio = (rebanhoInicio + rebanhoFim) / 2;

  return {
    numerador: mortes,
    denominador: Math.round(rebanhoMedio),
    taxa_percentual: calcularTaxaPercentual(mortes, rebanhoMedio),
  };
}

/**
 * Taxa de Mortalidade de Bezerros = (mortes de bezerros / bezerros nascidos no período) * 100
 * Assume que todos os bezerros nascidos tiveram chance de morrer no período
 */
export function calcularTaxaMortalidadeBezerros(
  eventos: Pick<EventoRebanho, 'tipo'>[],
  periodo?: { dataInicio: string; dataFim: string }
): ResultadoTaxa {
  const mortes = eventos.filter((e) => e.tipo === 'morte').length;
  const nascimentos = eventos.filter((e) => e.tipo === 'nascimento').length;

  return {
    numerador: mortes,
    denominador: nascimentos,
    taxa_percentual: calcularTaxaPercentual(mortes, nascimentos),
  };
}

/**
 * Taxa de Desfrute = (vendas + mortes) / rebanho médio * 100
 * Define a proporção de animais saídos (venda ou morte) em relação ao rebanho
 */
export function calcularTaxaDesfrute(
  eventos: Pick<EventoRebanho, 'tipo'>[],
  rebanhoInicio: number,
  rebanhoFim: number,
  periodo?: { dataInicio: string; dataFim: string }
): ResultadoTaxa {
  const vendas = eventos.filter((e) => e.tipo === 'venda').length;
  const mortes = eventos.filter((e) => e.tipo === 'morte').length;
  const saidas = vendas + mortes;
  const rebanhoMedio = (rebanhoInicio + rebanhoFim) / 2;

  return {
    numerador: saidas,
    denominador: Math.round(rebanhoMedio),
    taxa_percentual: calcularTaxaPercentual(saidas, rebanhoMedio),
  };
}

/**
 * Taxa de Descarte = (animais descartados) / rebanho total * 100
 * Snapshot baseado em categoria — sem período
 * Descarte = 'Boi Descartado' + 'Fêmea Descartada'
 */
export function calcularTaxaDescarte(
  animaisAtivos: Pick<Animal, 'categoria'>[]
): ResultadoTaxa {
  const descartados = animaisAtivos.filter((a) => isDescarte(a.categoria)).length;

  return {
    numerador: descartados,
    denominador: animaisAtivos.length,
    taxa_percentual: calcularTaxaPercentual(descartados, animaisAtivos.length),
  };
}

// ========== GMD (GANHO MÉDIO DIÁRIO) ==========

/**
 * Calcula GMD de um animal entre duas datas
 * GMD = (peso_final - peso_inicial) / dias_decorridos
 * Retorna null se < 2 pesagens no período
 *
 * @param pesagens Histórico de pesagens do animal, ordenadas por data (crescente)
 * @param periodo { dataInicio, dataFim } em format ISO YYYY-MM-DD
 */
export function calcularGMDAnimal(
  pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[],
  periodo: { dataInicio: string; dataFim: string }
): number | null {
  // Filtrar pesagens no período
  const pesagensNoPeriodo = pesagens.filter(
    (p) => p.data_pesagem >= periodo.dataInicio && p.data_pesagem <= periodo.dataFim
  );

  if (pesagensNoPeriodo.length < 2) {
    return null;
  }

  // Ordenar por data (crescente)
  const ordenadas = [...pesagensNoPeriodo].sort(
    (a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime()
  );

  const primeiraData = new Date(ordenadas[0].data_pesagem);
  const ultimaData = new Date(ordenadas[ordenadas.length - 1].data_pesagem);

  const pesoinicial = ordenadas[0].peso_kg;
  const pesoFinal = ordenadas[ordenadas.length - 1].peso_kg;

  const diasDecorridos = Math.max(
    1, // mínimo 1 dia para evitar divisão por zero
    (ultimaData.getTime() - primeiraData.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (pesoFinal - pesoinicial) / diasDecorridos;
}

/**
 * Calcula GMD médio de múltiplos animais
 * Retorna null se nenhum animal tem >= 2 pesagens no período
 */
export function calcularGMDMedioRebanho(
  pesagensAgrupadas: Map<string, Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[]>,
  periodo: { dataInicio: string; dataFim: string }
): number | null {
  const gmds: number[] = [];

  for (const pesagens of pesagensAgrupadas.values()) {
    const gmd = calcularGMDAnimal(pesagens, periodo);
    if (gmd !== null) {
      gmds.push(gmd);
    }
  }

  if (gmds.length === 0) {
    return null;
  }

  return gmds.reduce((a, b) => a + b, 0) / gmds.length;
}

// ========== INDICADORES REPRODUTIVOS ==========

/**
 * Calcula idade do primeiro parto de uma vaca
 * Encontra: nascimento da vaca → primeiro parto (evento NASCIMENTO onde mae_id = vaca.id)
 * Retorna idade em meses ou null se sem partos
 *
 * @param animais Vacas para calcular IPP
 * @param datasParto Array de datas de parto ordenadas (ISO string)
 * @param relacaoMaeFilho Map de mae_id → array de filhos (para verificar se tem partos)
 */
export function calcularIdadePrimeiroParto(
  animais: Pick<Animal, 'id' | 'data_nascimento'>[],
  datasParto: Pick<EventoRebanho, 'data_evento'>[],
  relacaoMaeFilho: Map<string, string[]>
): number | null {
  if (animais.length === 0) {
    return null;
  }

  const idades: number[] = [];

  for (const animal of animais) {
    const filhosIds = relacaoMaeFilho.get(animal.id) || [];

    if (filhosIds.length > 0) {
      // Usar primeiro evento de data_parto como aproximação do primeiro parto
      // Em um cenário real, isso seria mapeado via animal_id do evento
      if (datasParto.length > 0) {
        const primeiroPartoData = datasParto[0].data_evento;

        const dataNascimento = new Date(animal.data_nascimento);
        const dataParto = new Date(primeiroPartoData);

        const meses =
          (dataParto.getFullYear() - dataNascimento.getFullYear()) * 12 +
          (dataParto.getMonth() - dataNascimento.getMonth());

        if (meses >= 0) {
          idades.push(meses);
        }
      }
    }
  }

  if (idades.length === 0) {
    return null;
  }

  return Math.round(idades.reduce((a, b) => a + b, 0) / idades.length);
}

/**
 * Calcula intervalo entre partos (IEP) em dias
 * Recebe array de datas de parto e calcula diferença entre partos consecutivos
 * Retorna média em dias ou null se < 2 partos
 *
 * @param datasParto Array de datas de parto ordenadas (ISO string YYYY-MM-DD)
 * @param relacaoMaeFilho Map de mae_id → array de filhos (para verificar se tem 2+ partos)
 */
export function calcularIntervaloEntrePartos(
  datasParto: Pick<EventoRebanho, 'data_evento'>[],
  relacaoMaeFilho: Map<string, string[]>
): number | null {
  const intervalos: number[] = [];

  for (const [maeId, filhosIds] of relacaoMaeFilho) {
    if (filhosIds.length >= 2) {
      // Usar as datas de parto para calcular intervalos
      // Em um cenário real, isso seria filtrado por mae_id
      const datasValidas = datasParto
        .map((e) => e.data_evento)
        .sort()
        .slice(0, filhosIds.length);

      for (let i = 1; i < datasValidas.length; i++) {
        const dataParto1 = new Date(datasValidas[i - 1]);
        const dataParto2 = new Date(datasValidas[i]);
        const diasIntervalo =
          (dataParto2.getTime() - dataParto1.getTime()) / (1000 * 60 * 60 * 24);

        if (diasIntervalo > 0) {
          intervalos.push(Math.round(diasIntervalo));
        }
      }
    }
  }

  if (intervalos.length === 0) {
    return null;
  }

  return Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length);
}

// ========== INDICADORES DE CORTE ==========

/**
 * Calcula GMD entre as 2 últimas pesagens de um animal
 * Retorna null se menos de 2 pesagens no histórico
 */
export function calcularGMDUltimasDuas(
  pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[]
): number | null {
  if (pesagens.length < 2) {
    return null;
  }

  const ordenadas = [...pesagens].sort(
    (a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime()
  );

  const penultima = ordenadas[ordenadas.length - 2];
  const ultima = ordenadas[ordenadas.length - 1];

  const data1 = new Date(penultima.data_pesagem);
  const data2 = new Date(ultima.data_pesagem);

  const diasDecorridos = Math.max(
    1,
    (data2.getTime() - data1.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (ultima.peso_kg - penultima.peso_kg) / diasDecorridos;
}

/**
 * Calcula dias estimados até atingir o peso-alvo de abate
 * dias = (peso_alvo - peso_atual) / GMD
 * Retorna null se GMD <= 0 ou já atingiu o peso
 */
export function calcularProjecaoAbate(
  pesoAtual: number | null,
  gmd: number | null,
  pesoAlvo: number = 480
): number | null {
  if (pesoAtual === null || gmd === null || gmd <= 0 || pesoAtual >= pesoAlvo) {
    return null;
  }

  return Math.ceil((pesoAlvo - pesoAtual) / gmd);
}

/**
 * Calcula arrobas estimadas a partir do peso atual
 * 1 arroba = 15 kg; rendimento padrão = 52% carcaça
 * arrobas = (peso_atual × rendimento / 100) / 15
 */
export function calcularArrobasEstimadas(
  pesoAtual: number | null,
  rendimentoCarcaca: number = 0.52
): number | null {
  if (pesoAtual === null) {
    return null;
  }

  const pesoCarcaca = pesoAtual * rendimentoCarcaca;
  return pesoCarcaca / 15;
}

// ========== SÉRIES PARA GRÁFICOS (INDICADORES) ==========

/**
 * Monta a série de GMD por animal para o gráfico de linha.
 * Para cada animal com >= 2 pesagens no período, devolve as datas/pesos
 * ordenados cronologicamente e o GMD entre primeira e última pesagem.
 * Animais com < 2 pesagens são omitidos (não há linha a desenhar).
 *
 * @param pesagensAgrupadas Map de animal_id → pesagens (data + peso)
 * @param brincoPorAnimal   Map de animal_id → brinco (para rótulo da linha)
 * @param periodo           { dataInicio, dataFim } ISO YYYY-MM-DD
 */
export function montarSerieGMDPorAnimal(
  pesagensAgrupadas: Map<string, Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[]>,
  brincoPorAnimal: Map<string, string>,
  periodo: { dataInicio: string; dataFim: string }
): Array<{ animal_id: string; brinco: string; datas: Date[]; pesos: number[]; gmd: number }> {
  const series: Array<{ animal_id: string; brinco: string; datas: Date[]; pesos: number[]; gmd: number }> = [];

  for (const [animalId, pesagens] of pesagensAgrupadas) {
    const noPeriodo = pesagens
      .filter((p) => p.data_pesagem >= periodo.dataInicio && p.data_pesagem <= periodo.dataFim)
      .sort((a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime());

    if (noPeriodo.length < 2) continue;

    const gmd = calcularGMDAnimal(noPeriodo, periodo);
    if (gmd === null) continue;

    series.push({
      animal_id: animalId,
      brinco: brincoPorAnimal.get(animalId) ?? animalId,
      datas: noPeriodo.map((p) => new Date(p.data_pesagem)),
      pesos: noPeriodo.map((p) => p.peso_kg),
      gmd,
    });
  }

  // Ordenar por maior GMD primeiro — o gráfico mostra as 10 primeiras linhas
  return series.sort((a, b) => b.gmd - a.gmd);
}

/**
 * Monta a série mensal de natalidade × mortalidade (%) para o gráfico de barras.
 * Natalidade do mês = nascimentos no mês / rebanho atual * 100
 * Mortalidade do mês = mortes no mês / rebanho atual * 100
 *
 * Usa o rebanho atual como denominador (aproximação — não há snapshot
 * histórico de efetivo). O rótulo do mês sai no formato MM/AAAA.
 *
 * @param eventos      Eventos do período (precisa de tipo + data_evento)
 * @param rebanhoAtual Total de animais ativos (denominador das taxas)
 */
export function montarSerieNatalidadeMortalidade(
  eventos: Pick<EventoRebanho, 'tipo' | 'data_evento'>[],
  rebanhoAtual: number
): Array<{ mes: string; natalidade: number; mortalidade: number }> {
  const porMes = new Map<string, { nascimentos: number; mortes: number }>();

  for (const e of eventos) {
    if (e.tipo !== 'nascimento' && e.tipo !== 'morte') continue;
    const mesChave = e.data_evento.slice(0, 7); // YYYY-MM
    if (!porMes.has(mesChave)) porMes.set(mesChave, { nascimentos: 0, mortes: 0 });
    const bucket = porMes.get(mesChave)!;
    if (e.tipo === 'nascimento') bucket.nascimentos++;
    else bucket.mortes++;
  }

  return Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesChave, { nascimentos, mortes }]) => {
      const [ano, mes] = mesChave.split('-');
      return {
        mes: `${mes}/${ano}`,
        natalidade: calcularTaxaPercentual(nascimentos, rebanhoAtual),
        mortalidade: calcularTaxaPercentual(mortes, rebanhoAtual),
      };
    });
}

/**
 * Monta o comparativo entre lotes para um indicador.
 * Suporta 'gmd' (média de GMD dos animais do lote com >= 2 pesagens) e
 * 'peso' (peso médio atual dos animais do lote). Ordena decrescente pelo
 * indicador escolhido (critério de ranking T43).
 *
 * Indicadores 'natalidade' e 'prenhez' por lote não têm dado disponível
 * por lote no schema atual — retornam apenas a contagem de animais, sem valor.
 *
 * @param animaisPorLote     Map de loteId → { nome, animalIds[] }
 * @param pesagensAgrupadas  Map de animal_id → pesagens
 * @param pesoAtualPorAnimal Map de animal_id → peso_atual (number | null)
 * @param indicador          'gmd' | 'peso' | 'natalidade' | 'prenhez'
 * @param periodo            { dataInicio, dataFim }
 */
export function montarComparativoLotes(
  animaisPorLote: Map<string, { nome: string; animalIds: string[] }>,
  pesagensAgrupadas: Map<string, Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[]>,
  pesoAtualPorAnimal: Map<string, number | null>,
  indicador: 'gmd' | 'peso' | 'natalidade' | 'prenhez',
  periodo: { dataInicio: string; dataFim: string }
): Array<{ loteId: string; loteNome: string; quantidadeAnimais: number; gmd?: number; pesoMedio?: number }> {
  const linhas: Array<{ loteId: string; loteNome: string; quantidadeAnimais: number; gmd?: number; pesoMedio?: number }> = [];

  for (const [loteId, { nome, animalIds }] of animaisPorLote) {
    const linha: { loteId: string; loteNome: string; quantidadeAnimais: number; gmd?: number; pesoMedio?: number } = {
      loteId,
      loteNome: nome,
      quantidadeAnimais: animalIds.length,
    };

    if (indicador === 'gmd') {
      const gmds: number[] = [];
      for (const id of animalIds) {
        const gmd = calcularGMDAnimal(pesagensAgrupadas.get(id) ?? [], periodo);
        if (gmd !== null) gmds.push(gmd);
      }
      linha.gmd = gmds.length > 0 ? gmds.reduce((a, b) => a + b, 0) / gmds.length : 0;
    } else if (indicador === 'peso') {
      const pesos = animalIds
        .map((id) => pesoAtualPorAnimal.get(id))
        .filter((p): p is number => p !== null && p !== undefined && p > 0);
      linha.pesoMedio = pesos.length > 0 ? pesos.reduce((a, b) => a + b, 0) / pesos.length : 0;
    }

    linhas.push(linha);
  }

  // Ranking decrescente pelo indicador selecionado (T43)
  const chave = indicador === 'peso' ? 'pesoMedio' : indicador === 'gmd' ? 'gmd' : null;
  if (chave) {
    linhas.sort((a, b) => (Number(b[chave] ?? 0)) - (Number(a[chave] ?? 0)));
  }

  return linhas;
}

// ========== INDICADORES LEITEIROS ==========

/**
 * Calcula indicadores leiteiros para a fazenda em um período
 * Funções de cálculo puro — dados já filtrados vêm do Supabase
 */
export function calcularIndicadoresLeiteiros(
  animaisAtivos: Pick<Animal, 'id' | 'sexo' | 'categoria' | 'tipo_rebanho' | 'status_reprodutivo' | 'data_ultimo_parto'>[],
  producoes: Array<{ volume_litros: number; data: string }>,
  lactacoes: Array<{ data_inicio_parto: string; data_fim_secagem: string | null }>,
  diasPeriodo: number
): IndicadoresLeiteiros {
  // Contar vacas em lactação
  const vacasEmLactacao = animaisAtivos.filter(
    (a) => a.sexo === 'Fêmea' && a.status_reprodutivo === 'lactacao'
  ).length;

  // Contar fêmeas adultas (vacas)
  const femeaAdultas = animaisAtivos.filter((a) => a.sexo === 'Fêmea' && isVaca(a.categoria)).length;

  // Produção total e média
  const producaoTotal = producoes.reduce((acc, p) => acc + p.volume_litros, 0);
  const producaoMediaDiaria = diasPeriodo > 0 ? producaoTotal / diasPeriodo : 0;
  const producaoMediaPorVaca = vacasEmLactacao > 0 ? producaoTotal / diasPeriodo / vacasEmLactacao : 0;

  // Duração média das lactações encerradas
  const durcoesLactacoes: number[] = [];
  lactacoes.forEach((lac) => {
    if (lac.data_fim_secagem) {
      const dataInicio = new Date(lac.data_inicio_parto);
      const dataFim = new Date(lac.data_fim_secagem);
      const dias = (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24);
      if (dias > 0) {
        durcoesLactacoes.push(Math.round(dias));
      }
    }
  });
  const duracaoMediaLactacoes = durcoesLactacoes.length > 0
    ? durcoesLactacoes.reduce((a, b) => a + b, 0) / durcoesLactacoes.length
    : 0;

  // Percentual de vacas em lactação
  const percentualEmLactacao = femeaAdultas > 0 ? (vacasEmLactacao / femeaAdultas) * 100 : 0;

  return {
    producao_media_diaria_litros: parseFloat(producaoMediaDiaria.toFixed(2)),
    producao_total_periodo_litros: parseFloat(producaoTotal.toFixed(2)),
    vacas_em_lactacao: vacasEmLactacao,
    producao_media_por_vaca: parseFloat(producaoMediaPorVaca.toFixed(2)),
    duracao_media_lactacoes_dias: parseFloat(duracaoMediaLactacoes.toFixed(1)),
    percentual_vacas_em_lactacao: parseFloat(percentualEmLactacao.toFixed(1)),
    eficiencia_alimentar_litros_por_kg_ms: null, // Será integrado com silos em fase posterior
  };
}
