import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/admin-auth';
import SolicitacoesClient, { type Solicitacao } from './SolicitacoesClient';

export const dynamic = 'force-dynamic';

export default async function SolicitacoesPage() {
  const cookieStore = await cookies();
  const session = await getAdminSession(cookieStore);
  if (!session) redirect('/gestsilo-admin/login');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase
    .from('solicitacoes_acesso')
    .select(
      'id, nome, email, nome_fazenda, whatsapp, plano_solicitado, status, created_at, aprovado_em, rejeitado_em, observacoes, invite_enviado_em, arquivada_em',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('SolicitacoesPage: query error', error.message);
  }

  const STATUS_ORDER: Record<string, number> = { pendente: 0, aprovada: 1, rejeitada: 2, arquivada: 3 };
  const sorted = (data ?? []).slice().sort((a, b) => {
    const diff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) as Solicitacao[];

  return <SolicitacoesClient initialData={sorted} />;
}
