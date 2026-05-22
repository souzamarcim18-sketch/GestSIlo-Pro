import { redirect } from 'next/navigation';
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

  const [estoqueMovs, saidas90, animais] = await Promise.all([
    getEstoqueSilos(supabase),
    getConsumoPorPeriodo(supabase, dataCorte90),
    getAnimaisAtivosPorCategoria(supabase),
  ]);

  const estoqueTotal_kg = calcularEstoqueTotal(estoqueMovs);
  const initialConsumo = calcularConsumoHistorico(saidas90, 30, estoqueTotal_kg);
  const initialDemanda = calcularDemandaProjetada(animais, estoqueTotal_kg);

  return (
    <BalancoForrageiroClient
      estoqueTotal_kg={estoqueTotal_kg}
      initialConsumo={initialConsumo}
      initialDemanda={initialDemanda}
      saidasUltimos90Dias={saidas90}
      animaisPorCategoria={animais}
    />
  );
}
