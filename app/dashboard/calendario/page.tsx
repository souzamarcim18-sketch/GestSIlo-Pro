import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEventosCalendario } from '@/lib/supabase/calendario';
import { CalendarioClient } from './CalendarioClient';

export const metadata = { title: 'Calendário | GestSilo' };

interface Props {
  searchParams: Promise<{ mes?: string; talhao?: string; cultura?: string }>;
}

export default async function CalendarioPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const params = await searchParams;
  const mesStr = params.mes ?? new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const [ano, mes] = mesStr.split('-').map(Number);
  const dataInicio = `${mesStr}-01`;
  const dataFim = new Date(ano, mes, 0).toISOString().slice(0, 10);

  const [eventosRes, talhoesRes] = await Promise.all([
    getEventosCalendario(supabase, {
      dataInicio,
      dataFim,
      talhaoId: params.talhao,
      cultura: params.cultura,
    }),
    supabase.from('talhoes').select('id, nome').order('nome'),
  ]);

  return (
    <CalendarioClient
      initialEventos={eventosRes}
      talhoes={talhoesRes.data ?? []}
      mesAtual={mesStr}
    />
  );
}
