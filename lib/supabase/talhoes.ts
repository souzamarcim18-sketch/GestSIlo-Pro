import { supabase, Talhao, CicloAgricola } from '../supabase';

export async function getTalhoesByFazenda(fazendaId: string) {
  const { data, error } = await supabase
    .from('talhoes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Talhao[];
}

export async function getCiclosByTalhoes(talhaoIds: string[]) {
  const { data, error } = await supabase
    .from('ciclos_agricolas')
    .select('*')
    .in('talhao_id', talhaoIds)
    .order('data_plantio', { ascending: false });
  if (error) throw error;
  return data as CicloAgricola[];
}

export async function createTalhao(talhao: Omit<Talhao, 'id'>) {
  const { data, error } = await supabase
    .from('talhoes')
    .insert(talhao)
    .select()
    .single();
  if (error) throw error;
  return data as Talhao;
}

export async function createCiclo(ciclo: Omit<CicloAgricola, 'id'>) {
  const { data, error } = await supabase
    .from('ciclos_agricolas')
    .insert(ciclo)
    .select()
    .single();
  if (error) throw error;
  return data as CicloAgricola;
}

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
  
  const custoTotal = data?.reduce((acc: number, r) => acc + (r.valor || 0), 0) ?? 0;
  return custoTotal;
}
