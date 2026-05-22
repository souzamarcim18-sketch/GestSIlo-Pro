import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPastagemComResumo, listOcupacoesDoPiquete, listEventosManejoDoPiquete } from '@/lib/supabase/pastagens';
import { PastagemDetailClient } from './PastagemDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pastagem = await getPastagemComResumo(id);
  return { title: pastagem ? `${pastagem.nome} | Pastagens | GestSilo` : 'Pastagem | GestSilo' };
}

export default async function PastagemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  const pastagem = await getPastagemComResumo(id);
  if (!pastagem) notFound();

  // Buscar histórico de ocupações e eventos para todos os piquetes em paralelo
  const [ocupacoesMap, eventosMap] = await Promise.all([
    Promise.all(
      pastagem.piquetes.map(async (pq) => ({
        piqueteId: pq.id,
        ocupacoes: await listOcupacoesDoPiquete(pq.id, { incluirFechadas: true }),
      }))
    ),
    Promise.all(
      pastagem.piquetes.map(async (pq) => ({
        piqueteId: pq.id,
        eventos: await listEventosManejoDoPiquete(pq.id),
      }))
    ),
  ]);

  const ocupacoesPorPiquete = Object.fromEntries(
    ocupacoesMap.map(({ piqueteId, ocupacoes }) => [piqueteId, ocupacoes])
  );
  const eventosPorPiquete = Object.fromEntries(
    eventosMap.map(({ piqueteId, eventos }) => [piqueteId, eventos])
  );

  return (
    <PastagemDetailClient
      pastagem={pastagem}
      ocupacoesPorPiquete={ocupacoesPorPiquete}
      eventosPorPiquete={eventosPorPiquete}
      isAdmin={isAdmin}
    />
  );
}
