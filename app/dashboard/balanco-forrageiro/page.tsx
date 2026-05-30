import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getEstoqueSilos,
  getConsumoPorPeriodo,
  getAnimaisAtivosPorCategoria,
  getPiquetesAtivosParaBalanco,
} from '@/lib/supabase/balanco-forrageiro';
import {
  calcularEstoqueTotal,
  calcularConsumoHistorico,
  calcularDemandaProjetada,
  calcularOfertaPasto,
  calcularDemandaLiquidaSilos,
} from '@/lib/utils/balanco-forrageiro';
import { BalancoForrageiroClient } from './BalancoForrageiroClient';

export const metadata = {
  title: 'Balanço Forrageiro | GestSilo',
};

export default async function BalancoForrageiroPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const dataCorte90 = new Date();
  dataCorte90.setDate(dataCorte90.getDate() - 90);

  const [estoqueMovs, saidas90, animais, piquetesAtivos] = await Promise.all([
    getEstoqueSilos(supabase),
    getConsumoPorPeriodo(supabase, dataCorte90),
    getAnimaisAtivosPorCategoria(supabase),
    getPiquetesAtivosParaBalanco(supabase),
  ]);

  const estoqueTotal_kg = calcularEstoqueTotal(estoqueMovs);
  const initialConsumo = calcularConsumoHistorico(saidas90, 30, estoqueTotal_kg);
  const initialDemanda = calcularDemandaProjetada(animais, estoqueTotal_kg);
  const initialOfertaPasto = calcularOfertaPasto(piquetesAtivos, initialDemanda.demanda_total_kg_ms_dia);
  const initialDemandaLiquida = calcularDemandaLiquidaSilos(
    initialDemanda.demanda_total_kg_ms_dia,
    initialOfertaPasto.oferta_total_kg_ms_dia,
    estoqueTotal_kg
  );

  return (
    <BalancoForrageiroClient
      estoqueTotal_kg={estoqueTotal_kg}
      initialConsumo={initialConsumo}
      initialDemanda={initialDemanda}
      initialOfertaPasto={initialOfertaPasto}
      initialDemandaLiquida={initialDemandaLiquida}
      saidasUltimos90Dias={saidas90}
      animaisPorCategoria={animais}
      piquetesAtivos={piquetesAtivos}
    />
  );
}
