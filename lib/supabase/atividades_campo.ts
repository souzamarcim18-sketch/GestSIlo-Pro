import { supabase, AtividadeCampo } from '../supabase';

export async function getAtividadesByFazenda(fazendaId: string) {
  const { data, error } = await supabase
    .from('atividades_campo')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('data_atividade', { ascending: false });
  if (error) throw error;
  return data as AtividadeCampo[];
}

export async function getAtividadesByTalhao(talhaoId: string) {
  const { data, error } = await supabase
    .from('atividades_campo')
    .select('*')
    .eq('talhao_id', talhaoId)
    .order('data_atividade', { ascending: false });
  if (error) throw error;
  return data as AtividadeCampo[];
}

export async function createAtividade(atividade: Omit<AtividadeCampo, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('atividades_campo')
    .insert(atividade)
    .select()
    .single();
  if (error) throw error;
  return data as AtividadeCampo;
}

export async function updateAtividade(id: string, atividade: Partial<AtividadeCampo>) {
  const { data, error } = await supabase
    .from('atividades_campo')
    .update(atividade)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AtividadeCampo;
}

export async function deleteAtividade(id: string) {
  const { error } = await supabase
    .from('atividades_campo')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
