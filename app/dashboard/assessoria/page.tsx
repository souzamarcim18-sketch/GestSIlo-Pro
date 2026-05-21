import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { queryAnotacoes, queryAgendamentos } from '@/lib/supabase/assessoria';
import { AssessoriaClient } from './AssessoriaClient';

export const metadata = {
  title: 'Assessoria Agronômica | GestSilo',
};

export default async function AssessoriaPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('perfil, fazenda_id')
    .eq('id', user.id)
    .single();

  if (profileRes.data?.perfil !== 'Administrador') redirect('/dashboard');

  const fazendaId = await getCurrentFazendaId();

  const [anotacoes, agendamentos] = await Promise.all([
    queryAnotacoes.list(fazendaId),
    queryAgendamentos.list(fazendaId),
  ]);

  return (
    <AssessoriaClient
      initialAnotacoes={anotacoes}
      initialAgendamentos={agendamentos}
    />
  );
}
