import { CONSUMO_MS_POR_CATEGORIA, CONSUMO_MS_PADRAO } from '@/lib/constants/balanco-forrageiro';
import type { MovimentacaoSiloRow, AnimalPorCategoriaRow } from '@/lib/supabase/balanco-forrageiro';

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

export type BalancoForrageiroClientProps = {
  estoqueTotal_kg: number;
  initialConsumo: ResultadoConsumoReal;
  initialDemanda: ResultadoDemandaProjetada;
  saidasUltimos90Dias: MovimentacaoSiloRow[];
  animaisPorCategoria: AnimalPorCategoriaRow[];
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
