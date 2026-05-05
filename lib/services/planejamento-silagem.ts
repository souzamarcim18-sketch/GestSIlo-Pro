/**
 * lib/services/planejamento-silagem.ts
 *
 * Serviço TypeScript puro (sem dependências React/Next/Supabase) com funções
 * de cálculo para o módulo de planejamento de silagem.
 *
 * Todas as funções são testáveis isoladamente e seguem as fórmulas da spec.
 */

import {
  CategoriaCalculo,
  CategoriaPreDefinida,
  ResultadosPlanejamento,
  AlertaPlanejamento,
  ParametrosPlanejamento,
  DefinicaoSistema,
} from '@/lib/types/planejamento-silagem';
import { LIMITES_ALERTAS } from '@/lib/constants/planejamento-silagem';
import type { CategoriaProjetada } from '@/lib/types/rebanho';

/**
 * Calcula dados ajustados para cada categoria aplicando fatores do sistema.
 *
 * Fórmulas:
 * - cms_ajust = cms_base × fator_consumo
 * - pct_silagem_ajust = pct_silagem_base × fator_silagem
 * - silagem_ms_dia = cms_ajust × pct_silagem_ajust
 */
export function calcularCategoriaComAjustes(
  categoria: CategoriaPreDefinida,
  quantidade_cabecas: number,
  fator_consumo: number,
  fator_silagem: number
): CategoriaCalculo {
  const cms_ajust_kg_dia = categoria.cms_base_kg_dia * fator_consumo;
  const pct_silagem_ajust = categoria.pct_silagem_base * fator_silagem;
  const silagem_ms_dia_kg = cms_ajust_kg_dia * pct_silagem_ajust;

  return {
    ...categoria,
    quantidade_cabecas,
    cms_ajust_kg_dia,
    pct_silagem_ajust,
    silagem_ms_dia_kg,
    demanda_ms_ton: 0, // Preenchido em calcularResultados
    participacao_pct: 0, // Preenchido em calcularResultados
  };
}

/**
 * Calcula demanda MS para uma categoria específica.
 *
 * Fórmula: demanda_ms_ton = (n × silagem_ms_dia_kg × periodo_dias) / 1000
 */
export function calcularDemandaCategoria(
  cat: CategoriaCalculo,
  periodo_dias: number
): number {
  return (cat.quantidade_cabecas * cat.silagem_ms_dia_kg * periodo_dias) / 1000;
}

/**
 * Calcula resultados finais do planejamento.
 *
 * CONVENÇÃO DE UNIDADES:
 * - Cálculos intermediários: tudo em kg e kg/dia
 * - Saída: ton para massas, ha para área, m² para painel, kg/dia para consumo
 *
 * FÓRMULAS (todas em kg internamente):
 * 1. demandaMS_kg = Σ(n[i] × silagemMS_dia[i] × periodo)
 * 2. demandaMO_semPerdas_kg = demandaMS_kg / (teor_ms% / 100)
 * 3. demandaMO_comPerdas_kg = demandaMO_semPerdas_kg × (1 + perdas% / 100)
 * 4. consumoDiarioMO_kg = demandaMO_semPerdas_kg / periodo
 * 5. areaPlanio_ha = demandaMO_comPerdas_kg / (produtividade × 1000)
 * 6. areaPainel_m2 = consumoDiarioMO_kg / taxa_retirada
 */
export function calcularResultados(
  categorias_ajustadas: CategoriaCalculo[],
  periodo_dias: number,
  teor_ms_percent: number,
  perdas_percent: number,
  produtividade_ton_mo_ha: number,
  taxa_retirada_kg_m2_dia: number
): ResultadosPlanejamento {
  // 1. Demanda total MS (kg)
  const demandaMS_total_kg = categorias_ajustadas.reduce(
    (sum, cat) => sum + cat.quantidade_cabecas * cat.silagem_ms_dia_kg * periodo_dias,
    0
  );

  // 2. Demanda MO sem perdas (kg)
  const demandaMO_semPerdas_kg = demandaMS_total_kg / (teor_ms_percent / 100);

  // 3. Demanda MO com perdas (kg)
  const demandaMO_comPerdas_kg = demandaMO_semPerdas_kg * (1 + perdas_percent / 100);

  // 4. Consumo diário MO (kg/dia)
  const consumoDiarioMO_kg = demandaMO_semPerdas_kg / periodo_dias;

  // 5. Área de plantio (ha)
  const areaPlanio_ha = demandaMO_comPerdas_kg / (produtividade_ton_mo_ha * 1000);

  // 6. Área mínima painel frontal (m²)
  const areaPainel_m2 = consumoDiarioMO_kg / taxa_retirada_kg_m2_dia;

  // Calcular participação de cada categoria
  const categorias_com_participacao: CategoriaCalculo[] = categorias_ajustadas
    .map((cat) => {
      const demanda_cat_kg = cat.quantidade_cabecas * cat.silagem_ms_dia_kg * periodo_dias;
      return {
        ...cat,
        demanda_ms_ton: demanda_cat_kg / 1000,
        participacao_pct:
          demandaMS_total_kg > 0
            ? (demanda_cat_kg / demandaMS_total_kg) * 100
            : 0,
      };
    })
    .filter((cat) => cat.quantidade_cabecas > 0)
    .sort((a, b) => b.participacao_pct - a.participacao_pct);

  return {
    demanda_ms_total_ton: demandaMS_total_kg / 1000,
    demanda_mo_sem_perdas_ton: demandaMO_semPerdas_kg / 1000,
    demanda_mo_com_perdas_ton: demandaMO_comPerdas_kg / 1000,
    consumo_diario_mo_kg: Math.round(consumoDiarioMO_kg),
    area_plantio_ha: parseFloat(areaPlanio_ha.toFixed(1)),
    area_painel_m2: parseFloat(areaPainel_m2.toFixed(1)),
    categorias_calculo: categorias_com_participacao,
  };
}

/**
 * Gera exemplos de dimensão do painel frontal do silo.
 *
 * Lógica:
 * - Gera combinações com largura entre 2.0 e 8.0 m (step 0.5)
 * - Altura = area_m2 / largura
 * - Filtra alturas entre 1.5 e 4.5 m (range realista para silos)
 * - Retorna 2–3 combinações mais equilibradas (proporção ~1:1)
 * - Arredonda largura e altura para 1 casa decimal
 */
export function gerarExemplosDimensaoPainel(
  area_m2: number
): Array<{ largura: number; altura: number; area: number }> {
  const exemplos: Array<{ largura: number; altura: number; area: number }> = [];

  for (let largura = 2.0; largura <= 8.0; largura += 0.5) {
    const altura = area_m2 / largura;
    if (altura >= 1.5 && altura <= 4.5) {
      exemplos.push({
        largura: parseFloat(largura.toFixed(1)),
        altura: parseFloat(altura.toFixed(1)),
        area: parseFloat((largura * altura).toFixed(1)),
      });
    }
  }

  // Retorna 2–3 mais equilibradas (proporção mais próxima de 1:1)
  const melhorEquilibrio = exemplos
    .sort((a, b) => Math.abs(a.altura - a.largura) - Math.abs(b.altura - b.largura))
    .slice(0, 3);

  return melhorEquilibrio;
}

/**
 * Calcula painel para múltiplos silos abertos simultaneamente.
 *
 * Divide área por num_silos e gera 1 exemplo de dimensão para cada silo.
 */
export function calcularPainelMultiplosSilos(
  area_m2: number,
  num_silos: number
): { area_por_silo: number; exemplo: { largura: number; altura: number } } {
  const area_por_silo = area_m2 / num_silos;
  const exemplos = gerarExemplosDimensaoPainel(area_por_silo);

  return {
    area_por_silo: parseFloat(area_por_silo.toFixed(1)),
    exemplo:
      exemplos.length > 0
        ? { largura: exemplos[0].largura, altura: exemplos[0].altura }
        : {
            largura: 2.0,
            altura: parseFloat((area_por_silo / 2.0).toFixed(1)),
          },
  };
}

/**
 * Gera alertas dinâmicos baseado em parâmetros, resultados e sistema.
 *
 * Implementa as 11 condições da seção 11 da spec, usando textos exatos.
 */
export function gerarAlertasDinamicos(
  parametros: ParametrosPlanejamento,
  resultados: ResultadosPlanejamento,
  sistema: DefinicaoSistema
): AlertaPlanejamento[] {
  const alertas: AlertaPlanejamento[] = [];

  // 1. MS < 28% → warning
  if (parametros.teor_ms_percent < LIMITES_ALERTAS.teor_ms_critico_baixo) {
    alertas.push({
      tipo: 'warning',
      mensagem:
        'Silagem com MS abaixo de 28% pode apresentar perdas elevadas por efluente e fermentação clostrídica. Considere emurchecimento ou aditivos absorventes.',
    });
  }

  // 2. MS > 38% → warning
  if (parametros.teor_ms_percent > LIMITES_ALERTAS.teor_ms_critico_alto) {
    alertas.push({
      tipo: 'warning',
      mensagem:
        'Silagem com MS acima de 38% tem maior risco de aquecimento e baixa compactação. Atenção à vedação e ao processamento de grãos.',
    });
  }

  // 3. Perdas = 15% → info
  if (parametros.perdas_percent === LIMITES_ALERTAS.perdas_excelente) {
    alertas.push({
      tipo: 'info',
      mensagem:
        'Perdas de 15% representam silo muito bem manejado. Mantenha as boas práticas de vedação e compactação.',
    });
  }

  // 4. Área > 30 ha → info
  if (resultados.area_plantio_ha > LIMITES_ALERTAS.area_alta) {
    alertas.push({
      tipo: 'info',
      mensagem:
        'Área elevada de plantio. Considere escalonar a silagem ou usar múltiplos silos para melhor qualidade.',
    });
  }

  // 5. Cultura = Sorgo + tipo = Leite → info
  if (
    parametros.cultura === 'Sorgo' &&
    sistema.tipo_rebanho === 'Leite'
  ) {
    alertas.push({
      tipo: 'info',
      mensagem:
        'Silagem de sorgo pode ter menor valor energético que milho. Considere ajuste na dieta ou suplementação concentrada.',
    });
  }

  // 6. Confinado + alguma categoria com pct_silagem_ajust > 0.70 → warning
  if (sistema.sistema_producao === 'confinado') {
    const temAlgumaPctSilagemAlta = resultados.categorias_calculo.some(
      (cat) => cat.pct_silagem_ajust > LIMITES_ALERTAS.pct_silagem_max_confinado / 100
    );
    if (temAlgumaPctSilagemAlta) {
      alertas.push({
        tipo: 'warning',
        mensagem:
          'Participação de silagem acima de 70% em sistema confinado pode prejudicar desempenho. Reevaluate o plano nutricional.',
      });
    }
  }

  // 7. Período ≥ 300 dias → info
  if (parametros.periodo_dias >= LIMITES_ALERTAS.periodo_longo) {
    alertas.push({
      tipo: 'info',
      mensagem:
        'Fornecimento prolongado (≥ 300 dias) requer silagem de excelente qualidade e atenção especial à vedação.',
    });
  }

  // 8. Área painel > 20 m² → info
  if (resultados.area_painel_m2 > LIMITES_ALERTAS.area_painel_alta) {
    alertas.push({
      tipo: 'info',
      mensagem:
        'Área de painel elevada. Considere dividir o silo em múltiplos compartimentos para melhor controle de deterioração.',
    });
  }

  // 9. Área painel < 4 m² → warning
  if (resultados.area_painel_m2 < LIMITES_ALERTAS.area_painel_baixa) {
    alertas.push({
      tipo: 'warning',
      mensagem:
        'Consumo diário baixo para silos convencionais. Considere usar silos menores (tipo bag ou silagem em fardos).',
    });
  }

  // 10. Taxa retirada < 250 → warning
  if (parametros.taxa_retirada_kg_m2_dia < LIMITES_ALERTAS.taxa_retirada_minima) {
    alertas.push({
      tipo: 'warning',
      mensagem:
        'Taxa de retirada abaixo de 250 kg/m²/dia aumenta risco de deterioração aeróbia. Revise o consumo ou dimensionamento.',
    });
  }

  // 11. Sistema = pasto → info
  if (sistema.sistema_producao === 'pasto') {
    alertas.push({
      tipo: 'info',
      mensagem:
        'Em sistemas a pasto com baixo consumo diário, considere silagem em fardos ou outras formas de conservação.',
    });
  }

  return alertas;
}

/**
 * Mapeia categorias projetadas do rebanho para categorias pré-definidas do planejamento.
 * Usa normalização (lowercase, sem acento, sem espaço) para fazer match por nome.
 * Retorna quantidades mapeadas e lista de categorias não mapeadas.
 */
export function mapearCategoriasProjetadas(
  categoriasProjetadas: CategoriaProjetada[],
  tipoRebanho: 'Leite' | 'Corte',
  categoriasPreDefinidas: CategoriaPreDefinida[]
): { mapeadas: Record<string, number>; naoMapeadas: string[] } {
  const mapeadas: Record<string, number> = {};
  const naoMapeadas: string[] = [];

  // Normalizar função
  const normalizar = (texto: string): string => {
    return texto
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // Remove acentos
      .replace(/\s+/g, ''); // Remove espaços
  };

  // Criar mapa de categorias pré-definidas normalizadas
  const mapaPredefinidas: Record<string, CategoriaPreDefinida> = {};
  categoriasPreDefinidas.forEach((cat) => {
    const chaveNormalizada = normalizar(cat.nome);
    mapaPredefinidas[chaveNormalizada] = cat;
  });

  // Tentar mapear cada categoria projetada
  for (const catProjetada of categoriasProjetadas) {
    const chaveNormalizada = normalizar(catProjetada.nome);
    const catMatched = mapaPredefinidas[chaveNormalizada];

    if (catMatched) {
      mapeadas[catMatched.id] = catProjetada.quantidade_projetada;
    } else {
      naoMapeadas.push(catProjetada.nome);
    }
  }

  return { mapeadas, naoMapeadas };
}
