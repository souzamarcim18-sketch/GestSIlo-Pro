import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import stripe from '@/lib/stripe';
import { checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Price IDs por plano e período (configurados no Stripe Dashboard)
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    mensal: process.env.STRIPE_PRICE_STARTER_MENSAL ?? '',
    anual: process.env.STRIPE_PRICE_STARTER_ANUAL ?? '',
  },
  pro: {
    mensal: process.env.STRIPE_PRICE_PRO_MENSAL ?? '',
    anual: process.env.STRIPE_PRICE_PRO_ANUAL ?? '',
  },
  max: {
    mensal: process.env.STRIPE_PRICE_MAX_MENSAL ?? '',
    anual: process.env.STRIPE_PRICE_MAX_ANUAL ?? '',
  },
};

const checkoutSchema = z.object({
  plano: z.enum(['starter', 'pro', 'max']),
  periodo: z.enum(['mensal', 'anual']),
});

// Rate limit dedicado para checkout: 10 tentativas por hora por IP
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const checkoutRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: 'ratelimit:stripe-checkout',
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const { success } = await checkRateLimit(checkoutRateLimit, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    // Autenticação via Supabase Auth (fluxo dos produtores)
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

    // Validação do payload
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { plano, periodo } = parsed.data;

    // Price ID correspondente
    const priceId = PRICE_IDS[plano][periodo];
    if (!priceId) {
      return NextResponse.json({ error: 'Plano não disponível' }, { status: 400 });
    }

    // Busca fazenda_id e stripe_customer_id da tabela assinaturas
    const { data: profile } = await supabase
      .from('profiles')
      .select('fazenda_id')
      .eq('id', user.id)
      .single();

    if (!profile?.fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 400 });
    }

    const fazendaId = profile.fazenda_id as string;

    // Busca ou cria stripe_customer_id na tabela assinaturas
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('fazenda_id', fazendaId)
      .single();

    let stripeCustomerId = assinatura?.stripe_customer_id as string | null ?? null;

    if (!stripeCustomerId) {
      // Busca o email do usuário para criar o customer no Stripe
      const { data: fazenda } = await supabase
        .from('fazendas')
        .select('nome')
        .eq('id', fazendaId)
        .single();

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { fazenda_id: fazendaId, user_id: user.id },
        name: fazenda?.nome ?? undefined,
      });

      stripeCustomerId = customer.id;

      // Persiste o customer_id — upsert para evitar race condition
      await supabase
        .from('assinaturas')
        .upsert(
          { fazenda_id: fazendaId, stripe_customer_id: stripeCustomerId },
          { onConflict: 'fazenda_id' }
        );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    // Cria Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/configuracoes/plano?sucesso=1`,
      cancel_url: `${appUrl}/#planos`,
      metadata: { fazenda_id: fazendaId, plano, periodo },
      subscription_data: {
        metadata: { fazenda_id: fazendaId, plano, periodo },
      },
      locale: 'pt-BR',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar checkout Stripe:', error);
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
  }
}
