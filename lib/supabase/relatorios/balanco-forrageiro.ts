'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getEstoqueSilos,
  getConsumoPorPeriodo,
  getAnimaisAtivosPorCategoria,
} from '@/lib/supabase/balanco-forrageiro';
import {
  calcularEstoqueTotal,
  calcularConsumoHistorico,
  calcularDemandaProjetada,
  calcularComparativo,
  type DemandaCategoria,
} from '@/lib/utils/balanco-forrageiro';

export type PeriodoBalancoRelatorio = 7 | 30 | 60 | 90;

export interface RelatorioBalancoForrageiro {
  estoqueAtualTonMS: number;
  consumoDiarioMedioKg: number | null;
  demandaDiariaKg: number;
  autonomiaHistoricaDias: number | null;
  autonomiaProjetadaDias: number | null;
  saldoDiarioKg: number;
  detalhesPorCategoria: Array<{
    categoria: string;
    qtdAnimais: number;
    consumoKgDia: number;
    estimado: boolean;
  }>;
  periodoHistorico: { from: Date; to: Date };
  geradoEm: Date;
}

export async function getDadosBalancoForrageiro(
  diasHistorico: PeriodoBalancoRelatorio
): Promise<RelatorioBalancoForrageiro> {
  const supabase = await createSupabaseServerClient();

  const hoje = new Date();
  const dataCorte = new Date(hoje);
  dataCorte.setDate(dataCorte.getDate() - 90); // sempre busca 90 dias, filtra em JS

  const [todasMovimentacoes, saidasUltimos90Dias, animaisPorCategoria] = await Promise.all([
    getEstoqueSilos(supabase),
    getConsumoPorPeriodo(supabase, dataCorte),
    getAnimaisAtivosPorCategoria(supabase),
  ]);

  const estoqueTotal_kg = calcularEstoqueTotal(todasMovimentacoes);
  const consumo = calcularConsumoHistorico(saidasUltimos90Dias, diasHistorico, estoqueTotal_kg);
  const demanda = calcularDemandaProjetada(animaisPorCategoria, estoqueTotal_kg);
  const comparativo = calcularComparativo(consumo, demanda);

  const from = new Date(hoje);
  from.setDate(from.getDate() - diasHistorico);

  return {
    estoqueAtualTonMS: estoqueTotal_kg / 1000,
    consumoDiarioMedioKg: consumo.consumo_medio_diario_kg,
    demandaDiariaKg: demanda.demanda_total_kg_ms_dia,
    autonomiaHistoricaDias: consumo.autonomia_real_dias,
    autonomiaProjetadaDias: demanda.autonomia_projetada_dias,
    saldoDiarioKg: comparativo.saldo_diario_kg,
    detalhesPorCategoria: demanda.por_categoria.map((c: DemandaCategoria) => ({
      categoria: c.categoria,
      qtdAnimais: c.quantidade,
      consumoKgDia: c.consumo_total_kg_ms_dia,
      estimado: c.estimado,
    })),
    periodoHistorico: { from, to: hoje },
    geradoEm: new Date(),
  };
}
