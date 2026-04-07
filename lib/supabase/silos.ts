import { supabase, Silo } from '../supabase';

export async function getSilosByFazenda(fazendaId: string) {
  const { data, error } = await supabase
    .from('silos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Silo[];
}

export async function createSilo(silo: Omit<Silo, 'id'>) {
  const { data, error } = await supabase
    .from('silos')
    .insert(silo)
    .select()
    .single();
  if (error) throw error;
  return data as Silo;
}

export async function updateSilo(id: string, silo: Partial<Silo>) {
  const { data, error } = await supabase
    .from('silos')
    .update(silo)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Silo;
}

export async function deleteSilo(id: string) {
  const { error } = await supabase
    .from('silos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
