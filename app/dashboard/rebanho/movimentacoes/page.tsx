import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listLotes } from '@/lib/supabase/rebanho';
import { queryMovimentacoes } from '@/lib/supabase/rebanho-movimentacoes';
import { MovimentacoesClient } from './MovimentacoesClient';

export const metadata = {
  title: 'Movimentações | GestSilo',
};

export default async function MovimentacoesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const hoje = new Date();
  const dataFim = hoje.toISOString().split('T')[0];
  const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];

  const [lotesData, movResult, resumo, profileRes] = await Promise.all([
    listLotes(100, 0),
    queryMovimentacoes.list({ data_inicio: dataInicio, data_fim: dataFim }, 25, 0),
    queryMovimentacoes.getResumo(dataInicio, dataFim),
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
  ]);

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  return (
    <MovimentacoesClient
      initialMovimentacoes={movResult.data}
      initialLotes={lotesData}
      initialTotal={movResult.total}
      initialResumo={resumo}
      isAdmin={isAdmin}
    />
  );
}
