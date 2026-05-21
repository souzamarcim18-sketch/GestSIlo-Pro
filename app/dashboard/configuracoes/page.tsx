import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import type { Profile, Fazenda } from '@/lib/supabase';
import { ConfiguracoesClient } from './ConfiguracoesClient';

export const metadata = {
  title: 'Configurações | GestSilo',
};

export default async function ConfiguracoesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const [profileRes, fazendaRes, usersRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, perfil, fazenda_id, created_at, updated_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('fazendas')
      .select('id, nome, localizacao, area_total, latitude, longitude, created_at, updated_at')
      .eq('id', fazendaId)
      .single(),
    supabase
      .from('profiles')
      .select('id, nome, email, perfil, fazenda_id, created_at, updated_at')
      .eq('fazenda_id', fazendaId)
      .neq('id', user.id)
      .order('nome'),
  ]);

  if (!profileRes.data || !fazendaRes.data) redirect('/login');

  const profile  = profileRes.data  as Profile;
  const fazenda  = fazendaRes.data  as Fazenda;
  const users    = (usersRes.data ?? []) as Profile[];
  const isAdmin  = profile.perfil === 'Administrador';

  return (
    <ConfiguracoesClient
      initialProfile={profile}
      initialFazenda={fazenda}
      initialUsers={users}
      isAdmin={isAdmin}
      userId={user.id}
      fazendaId={fazendaId}
    />
  );
}
