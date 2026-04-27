import { supabase, Profile, Fazenda } from '../supabase';

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, perfil, role, fazenda_id, fazendas(nome)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}

export async function updateProfile(
  userId: string,
  data: { nome?: string; email?: string; telefone?: string | null }
): Promise<Profile> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select('id, nome, email, telefone, perfil, role, fazenda_id')
    .single();
  if (error) throw error;
  return updated as Profile;
}

export async function getFazenda(fazendaId: string): Promise<Fazenda> {
  const { data, error } = await supabase
    .from('fazendas')
    .select('id, nome, localizacao, area_total, latitude, longitude')
    .eq('id', fazendaId)
    .single();
  if (error) throw error;
  return data as Fazenda;
}

export async function updateFazenda(
  fazendaId: string,
  data: {
    nome?: string;
    localizacao?: string | null;
    area_total?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  }
): Promise<Fazenda> {
  const { data: updated, error } = await supabase
    .from('fazendas')
    .update(data)
    .eq('id', fazendaId)
    .select('id, nome, localizacao, area_total, latitude, longitude')
    .single();
  if (error) throw error;
  return updated as Fazenda;
}

export async function getUsersByFazenda(fazendaId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, perfil, role, fazenda_id')
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Profile[];
}
