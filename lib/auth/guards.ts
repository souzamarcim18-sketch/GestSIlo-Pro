import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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
