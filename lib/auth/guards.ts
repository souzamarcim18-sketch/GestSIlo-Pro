import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { parsePlanoSlug, planoPermiteModulo } from '@/lib/planos';

type Perfil = 'Administrador' | 'Operador' | 'Visualizador';

export async function requirePerfil(perfisPermitidos: Perfil[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect('/login');

  const perfil = user.user_metadata?.perfil as Perfil | undefined;
  if (!perfil || !perfisPermitidos.includes(perfil)) {
    redirect('/operador');
  }

  return { user, perfil };
}

export async function requireAdmin() {
  return requirePerfil(['Administrador']);
}

export async function requireAdminOuVisualizador() {
  return requirePerfil(['Administrador', 'Visualizador']);
}

/**
 * Verifica se o plano da fazenda permite acesso a um módulo.
 * Redireciona para /dashboard/configuracoes/plano?origem=<origem> se não permitir.
 * Também bloqueia Operador (redireciona para /operador).
 */
export async function requirePlano(modulo: string, origemParam?: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('perfil, fazenda_id')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');
  if (profile.perfil === 'Operador') redirect('/operador');
  if (!profile.fazenda_id) redirect('/dashboard/onboarding');

  const { data: fazenda } = await supabase
    .from('fazendas')
    .select('plano_atual')
    .eq('id', profile.fazenda_id)
    .single();

  const plano = parsePlanoSlug(fazenda?.plano_atual);
  if (!planoPermiteModulo(plano, modulo)) {
    const origem = origemParam ?? modulo;
    redirect(`/dashboard/configuracoes/plano?origem=${encodeURIComponent(origem)}`);
  }
}
