import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAnimaisAtivosParaLote } from '@/lib/supabase/rebanho-lote';
import { listLotes } from '@/lib/supabase/rebanho';
import { EventosLoteClient } from './EventosLoteClient';

export const metadata = { title: 'Lançamento em Lote | GestSilo' };

export default async function LoteEventosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const [animais, lotes] = await Promise.all([
    listAnimaisAtivosParaLote(),
    listLotes(500, 0),
  ]);

  return <EventosLoteClient animais={animais} lotes={lotes} />;
}
