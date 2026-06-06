import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/admin-auth';
import FazendasClient, { type FazendaRow } from './FazendasClient';

export const dynamic = 'force-dynamic';

export default async function FazendasPage() {
  const cookieStore = await cookies();
  const session = await getAdminSession(cookieStore);
  if (!session) redirect('/gestsilo-admin/login');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Busca fazendas com o perfil Administrador de cada uma via join
  const { data, error } = await supabase
    .from('fazendas')
    .select(
      'id, nome, plano_atual, created_at, profiles!profiles_fazenda_id_fkey(nome, email, perfil)',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('FazendasPage: query error', error.message);
  }

  type RawRow = {
    id: string;
    nome: string;
    plano_atual: string | null;
    created_at: string;
    profiles: { nome: string; email: string; perfil: string }[] | null;
  };

  const rows: FazendaRow[] = ((data ?? []) as unknown as RawRow[]).map((f) => {
    const admin = (f.profiles ?? []).find((p) => p.perfil === 'Administrador');
    return {
      id: f.id,
      nome: f.nome,
      dono_nome: admin?.nome ?? null,
      dono_email: admin?.email ?? null,
      plano_atual: f.plano_atual ?? 'free',
      created_at: f.created_at,
    };
  });

  return <FazendasClient initialData={rows} />;
}
