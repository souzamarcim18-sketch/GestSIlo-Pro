import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { listAnimais, listAnimaisParaPainel, countAnimais, listLotes, getPainelRebanhoExtras } from '@/lib/supabase/rebanho';
import { RebanhoClient } from './RebanhoClient';

export const metadata = {
  title: 'Rebanho | GestSilo',
};

export default async function RebanhosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const [animais, animaisParaPainel, totalAnimaisAtivos, lotes, painelExtras, profileRes] = await Promise.all([
    listAnimais({ status: 'Ativo' }, 50, 0),
    listAnimaisParaPainel(),
    countAnimais({ status: 'Ativo' }),
    listLotes(100, 0),
    getPainelRebanhoExtras(),
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
  ]);

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  return (
    <RebanhoClient
      initialAnimais={animais}
      initialTotal={totalAnimaisAtivos}
      animaisParaPainel={animaisParaPainel}
      initialLotes={lotes}
      painelExtras={painelExtras}
      isAdmin={isAdmin}
    />
  );
}
