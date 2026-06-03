import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/admin-auth';
import SolicitacoesClient, { type Solicitacao } from './SolicitacoesClient';

export const dynamic = 'force-dynamic';

export default async function SolicitacoesPage() {
  const cookieStore = await cookies();
  const session = getAdminSession(cookieStore);
  if (!session) redirect('/gestsilo-admin/login');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase
    .from('solicitacoes_acesso')
    .select(
      'id, nome, email, fazenda, whatsapp, plano, status, criado_em, aprovado_em, rejeitado_em, observacoes, invite_enviado_em',
    )
    .order('status', { ascending: true }) // pendente vem antes de aprovada/rejeitada alfabeticamente
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('SolicitacoesPage: query error', error.message);
  }

  // Garantir que pendentes venham primeiro
  const sorted = (data ?? []).slice().sort((a, b) => {
    if (a.status === 'pendente' && b.status !== 'pendente') return -1;
    if (a.status !== 'pendente' && b.status === 'pendente') return 1;
    return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
  }) as Solicitacao[];

  return <SolicitacoesClient initialData={sorted} />;
}
