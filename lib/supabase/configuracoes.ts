import { createSupabaseServerClient } from '../supabase/server';
import { supabase, Profile, Fazenda } from '../supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ConfiguracoesFazenda {
  id: string;
  fazenda_id: string;
  peso_concha_ton: number | null;
  peso_vagao_ton: number | null;
}

// ── Queries (client-side) ────────────────────────────────────────────────────

export async function getConfiguracoesFazenda(): Promise<ConfiguracoesFazenda | null> {
  const { data } = await supabase
    .from('configuracoes_fazenda')
    .select('id, fazenda_id, peso_concha_ton, peso_vagao_ton')
    .maybeSingle();
  return data ?? null;
}

// ── Queries (server-side) ────────────────────────────────────────────────────

export async function getConfiguracoesFazendaServer(): Promise<ConfiguracoesFazenda | null> {
  const client = await createSupabaseServerClient();
  const { data } = await client
    .from('configuracoes_fazenda')
    .select('id, fazenda_id, peso_concha_ton, peso_vagao_ton')
    .maybeSingle();
  return data ?? null;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, perfil, fazenda_id, fazendas(nome)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}

export async function updateProfile(
  userId: string,
  data: { nome?: string; email?: string }
): Promise<Profile> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select('id, nome, email, perfil, fazenda_id')
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
    .select('id, nome, email, perfil, fazenda_id')
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Profile[];
}
