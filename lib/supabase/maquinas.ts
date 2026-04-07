import { supabase, Maquina } from '../supabase';

export async function getMaquinasByFazenda(fazendaId: string) {
  const { data, error } = await supabase
    .from('maquinas')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Maquina[];
}

export async function createMaquina(maquina: Omit<Maquina, 'id'>) {
  const { data, error } = await supabase
    .from('maquinas')
    .insert(maquina)
    .select()
    .single();
  if (error) throw error;
  return data as Maquina;
}

export async function updateMaquina(id: string, maquina: Partial<Maquina>) {
  const { data, error } = await supabase
    .from('maquinas')
    .update(maquina)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Maquina;
}

export async function deleteMaquina(id: string) {
  const { error } = await supabase
    .from('maquinas')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
