import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile, Fazenda } from '@/lib/supabase';
import { ConfiguracoesClient } from './ConfiguracoesClient';

export const metadata = {
  title: 'Configurações | GestSilo',
};

export default async function ConfiguracoesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('id, nome, email, perfil, fazenda_id, created_at')
    .eq('id', user.id)
    .single();

  if (!profileRes.data) redirect('/login');

  const fazendaId = profileRes.data.fazenda_id;
  if (!fazendaId) redirect('/dashboard/onboarding');

  const [fazendaRes, usersRes, configRes] = await Promise.all([
    supabase
      .from('fazendas')
      .select('id, nome, localizacao, area_total, latitude, longitude, created_at')
      .eq('id', fazendaId)
      .single(),
    supabase
      .from('profiles')
      .select('id, nome, email, perfil, fazenda_id, created_at')
      .eq('fazenda_id', fazendaId)
      .order('nome'),
    supabase
      .from('configuracoes_fazenda')
      .select('id, fazenda_id, peso_concha_ton, peso_vagao_ton')
      .eq('fazenda_id', fazendaId)
      .maybeSingle(),
  ]);

  if (!fazendaRes.data) redirect('/login');

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
      initialConfiguracoes={configRes.data ?? null}
    />
  );
}
