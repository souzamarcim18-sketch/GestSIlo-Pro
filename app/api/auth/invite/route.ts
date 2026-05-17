import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { inviteRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { sendInviteEmail } from '@/lib/email/resend';
import { NextRequest, NextResponse } from 'next/server';

const PERFIS_PERMITIDOS = ['Operador', 'Visualizador'] as const;
type PerfilConvite = (typeof PERFIS_PERMITIDOS)[number];

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { success, remaining, resetIn } = await checkRateLimit(inviteRateLimit, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas de convite. Tente novamente mais tarde.', resetIn, remaining: 0 },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Serviço de convite não configurado. Contate o suporte.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('perfil, fazenda_id, nome')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });
    }

    if (adminProfile.perfil !== 'Administrador') {
      return NextResponse.json(
        { error: 'Apenas Administradores podem convidar usuários.' },
        { status: 403 }
      );
    }

    if (!adminProfile.fazenda_id) {
      return NextResponse.json(
        { error: 'Administrador sem fazenda vinculada.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, perfil } = body as { email?: string; perfil?: string };

    if (!email || !perfil) {
      return NextResponse.json({ error: 'E-mail e perfil são obrigatórios.' }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    if (!PERFIS_PERMITIDOS.includes(perfil as PerfilConvite)) {
      return NextResponse.json(
        { error: 'Perfil inválido. Use "Operador" ou "Visualizador".' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gestsilo.com.br';

    // 1. Criar o usuário diretamente via admin (sem enviar email pelo Supabase)
    //    email_confirm: true — já confirma o email, não precisa de verificação
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      email_confirm: true,
      app_metadata: {
        perfil,
        fazenda_id: adminProfile.fazenda_id,
        convidado_por: adminProfile.nome ?? user.email,
      },
      user_metadata: {
        perfil,
        fazenda_id: adminProfile.fazenda_id,
        nome: '',
      },
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este e-mail já possui uma conta cadastrada.' },
          { status: 409 }
        );
      }
      console.error('[INVITE] Erro ao criar usuário:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar convite. Tente novamente.' },
        { status: 500 }
      );
    }

    // 2. Gerar magic link para o primeiro acesso (não usa OTP de convite)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailNorm,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (linkError) {
      console.error('[INVITE] Erro ao gerar magic link:', linkError);
      return NextResponse.json(
        { error: 'Erro ao gerar link de acesso. Tente novamente.' },
        { status: 500 }
      );
    }

    const actionLink = linkData?.properties?.action_link ?? null;

    // 3. Enviar email via Resend
    if (actionLink) {
      const { error: emailError } = await sendInviteEmail({
        to: emailNorm,
        inviteLink: actionLink,
        perfil,
        convidadoPor: adminProfile.nome ?? user.email ?? 'Administrador',
      });

      if (emailError) {
        console.error('[INVITE] Erro ao enviar email via Resend:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Convite enviado para ${emailNorm}`,
      inviteLink: actionLink,
    });

  } catch (error) {
    console.error('[INVITE] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar convite. Tente novamente.' },
      { status: 500 }
    );
  }
}
