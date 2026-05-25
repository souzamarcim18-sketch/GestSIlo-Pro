import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { RelatoriosClient } from './RelatoriosClient';

export const metadata = {
  title: 'Relatórios | GestSilo',
};

export default async function RelatoriosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const { data: fazenda } = await supabase
    .from('fazendas')
    .select('nome')
    .eq('id', fazendaId)
    .single();

  return (
    <RelatoriosClient
      fazendaId={fazendaId}
      fazendaNome={fazenda?.nome ?? 'Minha Fazenda'}
    />
  );
}
