import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlanoClient } from './PlanoClient';

export const metadata = {
  title: 'Plano e Assinatura | GestSilo',
};

export default async function PlanoPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('id, perfil, fazenda_id')
    .eq('id', user.id)
    .single();

  if (!profileRes.data?.fazenda_id) redirect('/dashboard/onboarding');

  const fazendaId = profileRes.data.fazenda_id;
  const isAdmin = profileRes.data.perfil === 'Administrador';

  const [assinaturaRes, fazendaRes, silosRes, planejamentosRes, arquivadosRes] = await Promise.all([
    supabase
      .from('assinaturas')
      .select('plano, status, periodo_fim, stripe_customer_id')
      .eq('fazenda_id', fazendaId)
      .maybeSingle(),
    supabase
      .from('fazendas')
      .select('plano_atual')
      .eq('id', fazendaId)
      .single(),
    supabase
      .from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('fazenda_id', fazendaId),
    supabase
      .from('planejamentos_silagem')
      .select('id', { count: 'exact', head: true })
      .eq('fazenda_id', fazendaId),
    supabase
      .from('recursos_arquivados_downgrade')
      .select('id, tipo_recurso, dados_snapshot, created_at')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false }),
  ]);

  const assinatura = assinaturaRes.data;
  // fazendas.plano_atual é a fonte de verdade (atualizada pelo webhook Stripe);
  // a tabela assinaturas pode estar ausente em contas criadas manualmente.
  const plano = assinatura?.plano ?? fazendaRes.data?.plano_atual ?? 'free';
  const status = assinatura?.status ?? 'ativa';
  const periodoFim = assinatura?.periodo_fim ?? null;
  const temStripeCustomer = !!assinatura?.stripe_customer_id;

  const totalSilos = silosRes.count ?? 0;
  const totalPlanejamentos = planejamentosRes.count ?? 0;
  const arquivados = arquivadosRes.data ?? [];

  const LIMITES: Record<string, { silos: number | null; planejamentos: number | null }> = {
    free:    { silos: 2,    planejamentos: 1    },
    starter: { silos: null, planejamentos: null },
    pro:     { silos: null, planejamentos: null },
    max:     { silos: null, planejamentos: null },
  };

  const limites = LIMITES[plano] ?? LIMITES['free'];

  return (
    <PlanoClient
      plano={plano}
      status={status}
      periodoFim={periodoFim}
      totalSilos={totalSilos}
      totalPlanejamentos={totalPlanejamentos}
      limites={limites}
      arquivados={arquivados}
      isAdmin={isAdmin}
      temStripeCustomer={temStripeCustomer}
    />
  );
}
