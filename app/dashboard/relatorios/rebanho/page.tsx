import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { RebanhoBuilderClient } from './RebanhoBuilderClient';

export const metadata = {
  title: 'Construtor de Relatórios — Rebanho | GestSilo',
};

export default async function RebanhoBuilderPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const [fazendaRes, lotesRes] = await Promise.all([
    supabase.from('fazendas').select('nome').eq('id', fazendaId).single(),
    supabase
      .from('lotes')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true }),
  ]);

  return (
    <RebanhoBuilderClient
      fazendaId={fazendaId}
      fazendaNome={fazendaRes.data?.nome ?? 'Minha Fazenda'}
      lotes={lotesRes.data ?? []}
    />
  );
}
