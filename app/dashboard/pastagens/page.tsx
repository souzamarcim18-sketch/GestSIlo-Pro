import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPastagens, getPastagemComResumo } from '@/lib/supabase/pastagens';
import { PastagensClient } from './PastagensClient';
import type { PastagemComResumo } from '@/lib/types/pastagens';

export const metadata = {
  title: 'Pastagens | GestSilo',
};

export default async function PastagensPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  const pastagens = await listPastagens();

  const pastagensComResumo: PastagemComResumo[] = await Promise.all(
    pastagens.map(async (p) => {
      const resumo = await getPastagemComResumo(p.id);
      if (!resumo) {
        return {
          ...p,
          piquetes: [],
          total_piquetes: 0,
          em_pastejo: 0,
          em_descanso: 0,
          em_reforma: 0,
          interditados: 0,
          necessita_reforma_count: 0,
        };
      }
      return resumo;
    })
  );

  return <PastagensClient initialPastagens={pastagensComResumo} isAdmin={isAdmin} />;
}
