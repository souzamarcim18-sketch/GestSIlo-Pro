import { supabase, type Financeiro } from '../supabase';

/**
 * Calcula o custo total de um talhão em um período específico
 * baseado na tabela financeiro (referencia_tipo = 'Talhão')
 */
export async function getCustoTalhaoPeriodo(talhaoId: string, dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (error) throw error;
  
  const custoTotal = (data as Financeiro[])?.reduce((acc: number, r: Financeiro) => acc + (r.valor || 0), 0) ?? 0;
  return custoTotal;
}
