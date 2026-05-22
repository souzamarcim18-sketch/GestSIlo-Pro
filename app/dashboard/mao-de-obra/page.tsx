import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  listColaboradores,
  listAtividades,
  getKpisMensais,
} from '@/lib/supabase/mao-de-obra';
import { MaoDeObraClient } from './MaoDeObraClient';

export const metadata = {
  title: 'Mão de Obra | GestSilo',
};

export default async function MaoDeObraPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const [profileRes, colaboradores, atividades, kpis, talhoesRes, silosRes, maquinasRes] =
    await Promise.all([
      supabase.from('profiles').select('perfil').eq('id', user.id).single(),
      listColaboradores(supabase),
      listAtividades(supabase),
      getKpisMensais(supabase),
      supabase.from('talhoes').select('id, nome').order('nome'),
      supabase.from('silos').select('id, nome').order('nome'),
      supabase.from('maquinas').select('id, nome').order('nome'),
    ]);

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  return (
    <MaoDeObraClient
      initialColaboradores={colaboradores}
      initialAtividades={atividades}
      initialKpis={kpis}
      talhoes={(talhoesRes.data ?? []) as Array<{ id: string; nome: string }>}
      silos={(silosRes.data ?? []) as Array<{ id: string; nome: string }>}
      maquinas={(maquinasRes.data ?? []) as Array<{ id: string; nome: string }>}
      isAdmin={isAdmin}
    />
  );
}
