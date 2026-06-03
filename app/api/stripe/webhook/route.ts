export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';
import stripe from '@/lib/stripe';
import type { Database, Json } from '@/types/supabase';

// Service role — webhook não tem contexto de usuário autenticado
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Limites de recursos por plano free
const LIMITE_FREE_SILOS = 2;
const LIMITE_FREE_PLANEJAMENTOS = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getFazendaEmail(
  supabase: ReturnType<typeof getServiceClient>,
  fazendaId: string
): Promise<{ email: string | null; nome: string }> {
  const { data } = await supabase
    .from('profiles')
    .select('id, fazendas(nome)')
    .eq('fazenda_id', fazendaId)
    .eq('perfil', 'Administrador')
    .limit(1)
    .single();

  const fazendaNome = (data?.fazendas as unknown as { nome: string } | null)?.nome ?? 'sua fazenda';

  if (!data?.id) return { email: null, nome: fazendaNome };

  // Busca email via auth.users usando service role
  const { data: authUser } = await supabase.auth.admin.getUserById(data.id);
  return { email: authUser?.user?.email ?? null, nome: fazendaNome };
}

async function arquivarExcedentes(
  supabase: ReturnType<typeof getServiceClient>,
  fazendaId: string,
  planoAnterior: string,
  planoNovo: string
): Promise<void> {
  // Silos: mantém os 2 mais recentes, arquiva o resto
  const { data: silos } = await supabase
    .from('silos')
    .select('id, nome, tipo, volume_ensilado_ton_mv, created_at')
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false });

  if (silos && silos.length > LIMITE_FREE_SILOS) {
    const excedentes = silos.slice(LIMITE_FREE_SILOS);
    for (const silo of excedentes) {
      await supabase.from('recursos_arquivados_downgrade').insert({
        fazenda_id: fazendaId,
        tipo_recurso: 'silo',
        recurso_id: silo.id,
        dados_snapshot: silo as unknown as Json,
        plano_anterior: planoAnterior,
        plano_novo: planoNovo,
        motivo: 'downgrade_automatico',
      });
      // Não deleta o silo — apenas registra que está arquivado
      // A UI deve bloquear acesso com base no limite do plano
    }
  }

  // Planejamentos de silagem: mantém o mais recente, arquiva o resto
  const { data: planejamentos } = await supabase
    .from('planejamentos_silagem')
    .select('id, nome, created_at')
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false });

  if (planejamentos && planejamentos.length > LIMITE_FREE_PLANEJAMENTOS) {
    const excedentes = planejamentos.slice(LIMITE_FREE_PLANEJAMENTOS);
    for (const planj of excedentes) {
      await supabase.from('recursos_arquivados_downgrade').insert({
        fazenda_id: fazendaId,
        tipo_recurso: 'planejamento_silagem',
        recurso_id: planj.id,
        dados_snapshot: planj as unknown as Json,
        plano_anterior: planoAnterior,
        plano_novo: planoNovo,
        motivo: 'downgrade_automatico',
      });
    }
  }
}

// ─── Handlers por evento ─────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getServiceClient>,
  session: Stripe.Checkout.Session
): Promise<void> {
  const fazendaId = session.metadata?.fazenda_id;
  const plano = session.metadata?.plano;

  if (!fazendaId || !plano) {
    console.error('[webhook] checkout.session.completed: metadata ausente', { fazendaId, plano });
    return;
  }

  // Busca a subscription para obter período (API 2026-05-27: período está em items[0])
  let subscription: Stripe.Subscription | null = null;
  if (session.subscription) {
    subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
      expand: ['items.data'],
    });
  }

  const firstItem = subscription?.items?.data?.[0];
  const periodoInicio = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const periodoFim = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  // Upsert assinatura
  const { error: upsertError } = await supabase
    .from('assinaturas')
    .upsert(
      {
        fazenda_id: fazendaId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plano,
        status: 'ativa',
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      },
      { onConflict: 'fazenda_id' }
    );

  if (upsertError) {
    console.error('[webhook] Erro ao upsert assinatura:', upsertError);
  }

  // Atualiza plano_atual na fazenda
  const { error: fazendaError } = await supabase
    .from('fazendas')
    .update({ plano_atual: plano })
    .eq('id', fazendaId);

  if (fazendaError) {
    console.error('[webhook] Erro ao atualizar fazenda.plano_atual:', fazendaError);
  }

  // Email de confirmação
  if (resend) {
    const { email, nome } = await getFazendaEmail(supabase, fazendaId);
    if (email) {
      await resend.emails.send({
        from: 'GestSilo <noreply@gestsilo.com.br>',
        to: email,
        subject: `✅ Assinatura ${plano.charAt(0).toUpperCase() + plano.slice(1)} ativada — GestSilo`,
        html: `
          <p>Olá,</p>
          <p>Sua assinatura do plano <strong>${plano.toUpperCase()}</strong> para <strong>${nome}</strong> foi ativada com sucesso.</p>
          <p>Acesse sua conta em <a href="${APP_URL}/dashboard">${APP_URL}/dashboard</a>.</p>
          <p>Equipe GestSilo</p>
        `,
      }).catch((err: unknown) => console.error('[webhook] Erro ao enviar email confirmação:', err));
    }
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  // API 2026-05-27: subscription_id fica em parent.subscription_details.subscription
  const parentDetails = invoice.parent?.subscription_details;
  const subscriptionId = typeof parentDetails?.subscription === 'string'
    ? parentDetails.subscription
    : (parentDetails?.subscription as { id?: string } | null | undefined)?.id;

  if (!subscriptionId) return;

  // Busca período atualizado direto do Stripe (API 2026-05-27: período está em items[0])
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data'],
  });
  const firstItem = subscription.items?.data?.[0];
  const periodoFim = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('assinaturas')
    .update({ status: 'ativa', periodo_fim: periodoFim ?? undefined, cancelada_em: null })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('[webhook] Erro ao atualizar período após renovação:', error);
  }
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  // API 2026-05-27: subscription_id fica em parent.subscription_details.subscription
  const parentDetails = invoice.parent?.subscription_details;
  const subscriptionId = typeof parentDetails?.subscription === 'string'
    ? parentDetails.subscription
    : (parentDetails?.subscription as { id?: string } | null | undefined)?.id;

  if (!subscriptionId) return;

  const { data: assinatura, error: fetchError } = await supabase
    .from('assinaturas')
    .select('fazenda_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (fetchError || !assinatura) {
    console.error('[webhook] Assinatura não encontrada para invoice falha:', subscriptionId);
    return;
  }

  const { error } = await supabase
    .from('assinaturas')
    .update({ status: 'inadimplente' })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('[webhook] Erro ao marcar inadimplente:', error);
  }

  // Email de aviso
  if (resend) {
    const { email, nome } = await getFazendaEmail(supabase, assinatura.fazenda_id);
    if (email) {
      await resend.emails.send({
        from: 'GestSilo <noreply@gestsilo.com.br>',
        to: email,
        subject: '⚠️ Falha no pagamento da assinatura — GestSilo',
        html: `
          <p>Olá,</p>
          <p>Não conseguimos processar o pagamento da assinatura de <strong>${nome}</strong>.</p>
          <p>Por favor, verifique seu método de pagamento em <a href="${APP_URL}/dashboard/configuracoes/plano">${APP_URL}/dashboard/configuracoes/plano</a>.</p>
          <p>Equipe GestSilo</p>
        `,
      }).catch((err: unknown) => console.error('[webhook] Erro ao enviar email inadimplência:', err));
    }
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const fazendaId = subscription.metadata?.fazenda_id;
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('fazenda_id, plano')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  const resolvedFazendaId = fazendaId ?? assinatura?.fazenda_id;
  const planoAnterior = assinatura?.plano ?? 'starter';

  if (!resolvedFazendaId) {
    console.error('[webhook] subscription.deleted: fazenda_id não encontrado', subscription.id);
    return;
  }

  await supabase
    .from('assinaturas')
    .update({ status: 'cancelada', plano: 'free', cancelada_em: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  await supabase
    .from('fazendas')
    .update({ plano_atual: 'free' })
    .eq('id', resolvedFazendaId);

  await arquivarExcedentes(supabase, resolvedFazendaId, planoAnterior, 'free');
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const fazendaId = subscription.metadata?.fazenda_id;

  if (!fazendaId) {
    // Tenta resolver pelo stripe_subscription_id
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('fazenda_id, plano')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!assinatura) {
      console.error('[webhook] subscription.updated: fazenda não encontrada', subscription.id);
      return;
    }

    await processSubscriptionUpdate(supabase, subscription, assinatura.fazenda_id, assinatura.plano);
    return;
  }

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano')
    .eq('fazenda_id', fazendaId)
    .single();

  await processSubscriptionUpdate(supabase, subscription, fazendaId, assinatura?.plano ?? 'starter');
}

async function processSubscriptionUpdate(
  supabase: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription,
  fazendaId: string,
  planoAnterior: string
): Promise<void> {
  // Extrai o plano a partir dos metadados da subscription ou do price nickname
  const planoNovo = subscription.metadata?.plano
    ?? subscription.items.data[0]?.price?.nickname?.toLowerCase()
    ?? planoAnterior;

  // API 2026-05-27: período está em items[0]
  const firstItem = subscription.items?.data?.[0];
  const periodoFim = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  await supabase
    .from('assinaturas')
    .update({ plano: planoNovo, periodo_fim: periodoFim ?? undefined, status: subscription.status === 'active' ? 'ativa' : subscription.status })
    .eq('stripe_subscription_id', subscription.id);

  await supabase
    .from('fazendas')
    .update({ plano_atual: planoNovo })
    .eq('id', fazendaId);

  // Downgrade → arquiva excedentes
  const ordemPlanos = ['free', 'starter', 'pro', 'max'];
  const idxAnterior = ordemPlanos.indexOf(planoAnterior);
  const idxNovo = ordemPlanos.indexOf(planoNovo);

  if (idxNovo < idxAnterior) {
    await arquivarExcedentes(supabase, fazendaId, planoAnterior, planoNovo);
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    console.error('[webhook] stripe-signature ausente');
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[webhook] Falha na validação da assinatura:', message);
    return NextResponse.json({ error: `Webhook inválido: ${message}` }, { status: 400 });
  }

  console.log(`[webhook] Evento recebido: ${event.type} | id: ${event.id}`);

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[webhook] Evento não tratado: ${event.type}`);
    }
  } catch (err) {
    // Sempre 200 — Stripe não deve retentar erros de negócio
    console.error(`[webhook] Erro ao processar ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
