'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Verifica se o usuário logado é Administrador.
 * Lança erro se não autenticado ou sem permissão.
 */
export async function sou_admin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado.');
  }

  return profile.perfil === 'Administrador';
}

/**
 * Verifica se o usuário logado é Operador.
 */
export async function sou_operador(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado.');
  }

  return profile.perfil === 'Operador';
}

/**
 * Verifica se o usuário logado é Operador ou Administrador.
 */
export async function sou_operador_ou_admin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado.');
  }

  return profile.perfil === 'Operador' || profile.perfil === 'Administrador';
}

/**
 * Obtém o user_id do usuário logado.
 * Lança erro se não autenticado.
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado.');
  }

  return user.id;
}

/**
 * Obtém o fazenda_id do usuário logado a partir da tabela profiles.
 *
 * SEGURANÇA: NÃO usar user_metadata.fazenda_id — é editável pelo
 * cliente via supabase.auth.updateUser({ data: {...} }).
 * Esta função busca de profiles, que é protegida por RLS
 * (policy profiles_select USING id = auth.uid()).
 *
 * Lança erro se não autenticado ou sem fazenda associada.
 */
export async function getCurrentFazendaId(): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado.');
  }

  if (!profile.fazenda_id) {
    throw new Error('Fazenda não associada ao usuário.');
  }

  return profile.fazenda_id;
}
