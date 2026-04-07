import { supabase, Insumo } from '../supabase';

export async function getInsumosByFazenda(fazendaId: string) {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Insumo[];
}
