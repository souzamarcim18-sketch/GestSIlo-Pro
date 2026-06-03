import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('fazenda_id, perfil')
      .eq('id', user.id)
      .single();

    if (!profile?.fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 400 });
    }

    if (profile.perfil !== 'Administrador') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('fazenda_id', profile.fazenda_id)
      .single();

    const stripeCustomerId = assinatura?.stripe_customer_id as string | null | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/dashboard/configuracoes/plano`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar portal Stripe:', error);
    return NextResponse.json({ error: 'Erro ao abrir portal de pagamento' }, { status: 500 });
  }
}
