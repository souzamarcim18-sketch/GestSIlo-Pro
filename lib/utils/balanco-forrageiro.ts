import {
  CONSUMO_MS_POR_CATEGORIA,
  CONSUMO_MS_PADRAO,
  OFERTA_MS_POR_ESPECIE,
  OFERTA_MS_PADRAO,
  COBERTURA_PASTO_MINIMA_PERC,
  MULTIPLICADOR_TECNOLOGIA,
  getEpocaAtual,
  type EpocaAno,
  type NivelTecnologia,
} from '@/lib/constants/balanco-forrageiro';
import type { MovimentacaoSiloRow, AnimalPorCategoriaRow, PiqueteAtivoRow } from '@/lib/supabase/balanco-forrageiro';

export type { MovimentacaoSiloRow, AnimalPorCategoriaRow };

export type ConsumoSilo = {
  silo_id: string;
  nome: string;
  consumo_total_kg: number;
  percentual: number;
};

export type DemandaCategoria = {
  categoria: string;
  quantidade: number;
  consumo_unitario_kg_ms_dia: number;
  consumo_total_kg_ms_dia: number;
  estimado: boolean;
};

export type ResultadoConsumoReal = {
  periodo_dias: number;
  consumo_total_kg: number;
  consumo_medio_diario_kg: number | null;
  autonomia_real_dias: number | null;
  por_silo: ConsumoSilo[];
  sem_dados: boolean;
};

export type ResultadoDemandaProjetada = {
  por_categoria: DemandaCategoria[];
  demanda_total_kg_ms_dia: number;
  autonomia_projetada_dias: number | null;
  tem_categorias_estimadas: boolean;
};

export type ResultadoComparativo = {
  saldo_diario_kg: number;
  diferenca_autonomia_dias: number | null;
  status: 'superavit' | 'equilibrado' | 'deficit';
};

export type PeriodoBalanco = 7 | 30 | 60 | 90;

// ─── Tipos de oferta de pasto ────────────────────────────────────────────────

export type PiqueteContribuicao = {
  piquete_id: string;
  piquete_nome: string;
  pastagem_nome: string;
  area_ha: number;
  especie_forrageira: string | null;
  especie_estimada: boolean;
  nivel_tecnologia: NivelTecnologia;
  status: string;
  oferta_kg_ms_dia: number;
  ua_real: number | null;
  ua_suportada: number | null;
  quantidade_animais: number | null;
  sistema_pastejo: string;
};

export type ResultadoOfertaPasto = {
  epoca: EpocaAno;
  oferta_total_kg_ms_dia: number;
  por_piquete: PiqueteContribuicao[];
  sem_piquetes: boolean;
  piquetes_sem_especie: number;
  alerta_cobertura_baixa: boolean;
};

export type ResultadoDemandaLiquidaSilos = {
  demanda_liquida_kg_ms_dia: number;
  autonomia_liquida_dias: number | null;
  pasto_cobre_tudo: boolean;
};

export type BalancoForrageiroClientProps = {
  estoqueTotal_kg: number;
  initialConsumo: ResultadoConsumoReal;
  initialDemanda: ResultadoDemandaProjetada;
  initialOfertaPasto: ResultadoOfertaPasto;
  initialDemandaLiquida: ResultadoDemandaLiquidaSilos;
  saidasUltimos90Dias: MovimentacaoSiloRow[];
  animaisPorCategoria: AnimalPorCategoriaRow[];
  piquetesAtivos: PiqueteAtivoRow[];
};

export function calcularEstoqueTotal(
  movimentacoes: Pick<MovimentacaoSiloRow, 'tipo' | 'quantidade'>[]
): number {
  let total = 0;
  for (const mov of movimentacoes) {
    if (mov.tipo === 'Entrada') {
      total += mov.quantidade;
    } else {
      total -= mov.quantidade;
    }
  }
  return total * 1000;
}

export function calcularConsumoHistorico(
  saidasUltimos90Dias: MovimentacaoSiloRow[],
  periodoDias: number,
  estoqueTotal_kg: number
): ResultadoConsumoReal {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataCorte = new Date(hoje);
  dataCorte.setDate(dataCorte.getDate() - periodoDias);
  const dataCorteStr = dataCorte.toISOString().split('T')[0];

  const saidasNoPeriodo = saidasUltimos90Dias.filter(
    (m) => m.subtipo !== 'Descarte' && m.data >= dataCorteStr
  );

  if (saidasNoPeriodo.length === 0) {
    return {
      periodo_dias: periodoDias,
      consumo_total_kg: 0,
      consumo_medio_diario_kg: null,
      autonomia_real_dias: null,
      por_silo: [],
      sem_dados: true,
    };
  }

  const consumo_total_kg = saidasNoPeriodo.reduce(
    (acc, s) => acc + s.quantidade * 1000,
    0
  );
  const consumo_medio_diario_kg = consumo_total_kg / periodoDias;

  const silosMap = new Map<string, { nome: string; consumo_kg: number }>();
  for (const saida of saidasNoPeriodo) {
    const entry = silosMap.get(saida.silo_id);
    if (entry) {
      entry.consumo_kg += saida.quantidade * 1000;
    } else {
      silosMap.set(saida.silo_id, {
        nome: saida.silo_nome,
        consumo_kg: saida.quantidade * 1000,
      });
    }
  }

  const por_silo: ConsumoSilo[] = Array.from(silosMap.entries()).map(
    ([silo_id, { nome, consumo_kg }]) => ({
      silo_id,
      nome,
      consumo_total_kg: consumo_kg,
      percentual: (consumo_kg / consumo_total_kg) * 100,
    })
  );

  return {
    periodo_dias: periodoDias,
    consumo_total_kg,
    consumo_medio_diario_kg,
    autonomia_real_dias: Math.floor(estoqueTotal_kg / consumo_medio_diario_kg),
    por_silo,
    sem_dados: false,
  };
}

export function calcularDemandaProjetada(
  animaisPorCategoria: AnimalPorCategoriaRow[],
  estoqueTotal_kg: number
): ResultadoDemandaProjetada {
  let tem_categorias_estimadas = false;
  const por_categoria: DemandaCategoria[] = [];

  for (const { categoria, quantidade } of animaisPorCategoria) {
    const consumoMapeado = CONSUMO_MS_POR_CATEGORIA.get(categoria);
    const estimado = consumoMapeado === undefined;
    if (estimado) tem_categorias_estimadas = true;
    const consumo_unitario_kg_ms_dia = consumoMapeado ?? CONSUMO_MS_PADRAO;

    por_categoria.push({
      categoria,
      quantidade,
      consumo_unitario_kg_ms_dia,
      consumo_total_kg_ms_dia: consumo_unitario_kg_ms_dia * quantidade,
      estimado,
    });
  }

  const demanda_total_kg_ms_dia = por_categoria.reduce(
    (acc, p) => acc + p.consumo_total_kg_ms_dia,
    0
  );

  const autonomia_projetada_dias =
    demanda_total_kg_ms_dia === 0
      ? null
      : Math.floor(estoqueTotal_kg / demanda_total_kg_ms_dia);

  return {
    por_categoria,
    demanda_total_kg_ms_dia,
    autonomia_projetada_dias,
    tem_categorias_estimadas,
  };
}

export function calcularComparativo(
  consumo: ResultadoConsumoReal,
  demanda: ResultadoDemandaProjetada
): ResultadoComparativo {
  if (
    consumo.consumo_medio_diario_kg === null ||
    demanda.demanda_total_kg_ms_dia === 0
  ) {
    return { saldo_diario_kg: 0, diferenca_autonomia_dias: null, status: 'equilibrado' };
  }

  const saldo_diario_kg =
    consumo.consumo_medio_diario_kg - demanda.demanda_total_kg_ms_dia;

  const referencia = Math.max(
    consumo.consumo_medio_diario_kg,
    demanda.demanda_total_kg_ms_dia
  );
  const desvio_percentual = Math.abs(saldo_diario_kg) / referencia;

  let status: 'superavit' | 'equilibrado' | 'deficit';
  if (desvio_percentual <= 0.05) {
    status = 'equilibrado';
  } else if (saldo_diario_kg > 0) {
    status = 'deficit';
  } else {
    status = 'superavit';
  }

  const diferenca_autonomia_dias =
    consumo.autonomia_real_dias !== null && demanda.autonomia_projetada_dias !== null
      ? consumo.autonomia_real_dias - demanda.autonomia_projetada_dias
      : null;

  return { saldo_diario_kg, diferenca_autonomia_dias, status };
}

function normalizarNivelTecnologia(valor: string | null | undefined): NivelTecnologia {
  return valor === 'baixo' || valor === 'alto' ? valor : 'medio';
}

export function calcularOfertaPasto(
  piquetes: PiqueteAtivoRow[],
  demandaTotalKgMsDia: number,
  mesAtual?: number
): ResultadoOfertaPasto {
  const epoca = getEpocaAtual(mesAtual);
  let piquetes_sem_especie = 0;

  if (piquetes.length === 0) {
    return {
      epoca,
      oferta_total_kg_ms_dia: 0,
      por_piquete: [],
      sem_piquetes: true,
      piquetes_sem_especie: 0,
      alerta_cobertura_baixa: demandaTotalKgMsDia > 0,
    };
  }

  const por_piquete: PiqueteContribuicao[] = piquetes.map((p) => {
    const mapeado = p.especie_forrageira
      ? OFERTA_MS_POR_ESPECIE.get(p.especie_forrageira)
      : undefined;
    const especie_estimada = mapeado === undefined;
    if (especie_estimada) piquetes_sem_especie++;

    const nivel = normalizarNivelTecnologia(p.nivel_tecnologia);
    const multiplicador = MULTIPLICADOR_TECNOLOGIA[nivel];
    const taxaEspecie = mapeado ?? OFERTA_MS_PADRAO;
    const oferta_kg_ms_dia = taxaEspecie[epoca] * multiplicador * p.area_ha;

    return {
      piquete_id: p.piquete_id,
      piquete_nome: p.piquete_nome,
      pastagem_nome: p.pastagem_nome,
      area_ha: p.area_ha,
      especie_forrageira: p.especie_forrageira,
      especie_estimada,
      nivel_tecnologia: nivel,
      status: p.status,
      oferta_kg_ms_dia,
      ua_real: p.ua_real,
      ua_suportada: p.ua_suportada,
      quantidade_animais: p.quantidade_animais,
      sistema_pastejo: p.sistema_pastejo,
    };
  });

  const oferta_total_kg_ms_dia = por_piquete.reduce(
    (acc, p) => acc + p.oferta_kg_ms_dia,
    0
  );

  const cobertura = demandaTotalKgMsDia > 0
    ? oferta_total_kg_ms_dia / demandaTotalKgMsDia
    : 1;

  return {
    epoca,
    oferta_total_kg_ms_dia,
    por_piquete,
    sem_piquetes: false,
    piquetes_sem_especie,
    alerta_cobertura_baixa: cobertura < COBERTURA_PASTO_MINIMA_PERC,
  };
}

export function calcularDemandaLiquidaSilos(
  demandaTotalKgMsDia: number,
  ofertaPastoKgMsDia: number,
  estoqueTotal_kg: number
): ResultadoDemandaLiquidaSilos {
  const demanda_liquida_kg_ms_dia = Math.max(
    0,
    demandaTotalKgMsDia - ofertaPastoKgMsDia
  );
  const pasto_cobre_tudo = ofertaPastoKgMsDia >= demandaTotalKgMsDia;
  const autonomia_liquida_dias =
    demanda_liquida_kg_ms_dia === 0
      ? null
      : Math.floor(estoqueTotal_kg / demanda_liquida_kg_ms_dia);

  return { demanda_liquida_kg_ms_dia, autonomia_liquida_dias, pasto_cobre_tudo };
}

export function classesAutonomia(dias: number | null): {
  text: string;
  bg: string;
  label: 'critico' | 'urgente' | 'ok' | 'sem-dados';
} {
  if (dias === null) {
    return { text: 'text-muted-foreground', bg: '', label: 'sem-dados' };
  }
  if (dias < 10) {
    return { text: 'text-destructive', bg: 'bg-destructive/10', label: 'critico' };
  }
  if (dias < 30) {
    return {
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500/10',
      label: 'urgente',
    };
  }
  return {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    label: 'ok',
  };
}
