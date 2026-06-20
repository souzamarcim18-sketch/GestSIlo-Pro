import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase';
import { MaquinaDetailClient } from './MaquinaDetailClient';

export const metadata = {
  title: 'Máquina | Frota | GestSilo',
};

export default async function MaquinaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('id, nome, email, perfil, fazenda_id, created_at, updated_at')
    .eq('id', user.id)
    .single();

  const profile = profileRes.data as Profile | null;

  return <MaquinaDetailClient maquinaId={id} profile={profile} />;
}
