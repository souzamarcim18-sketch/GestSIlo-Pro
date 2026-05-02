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
