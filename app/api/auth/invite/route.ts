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
    // 1. Rate limiting por IP
    const ip = getClientIP(request);
    const { success, remaining, resetIn } = await checkRateLimit(inviteRateLimit, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas de convite. Tente novamente mais tarde.', resetIn, remaining: 0 },
        { status: 429 }
      );
    }

    // 2. Verificar sessão e perfil do solicitante (deve ser Administrador)
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

    // 3. Buscar perfil e fazenda_id do admin via service_role
    //    (evita bloqueio da RLS profiles_select_mesma_fazenda em contexto SSR)
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

    // 4. Validar body
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

    // 5. Gerar invite link via service_role — o Supabase envia o email automaticamente
    //    e também retornamos o link para o admin copiar como backup
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: emailNorm,
      options: {
        data: {
          // app_metadata — lido pelo trigger handle_new_user para preencher o profile
          perfil,
          fazenda_id: adminProfile.fazenda_id,
          convidado_por: adminProfile.nome ?? user.email,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    });

    if (inviteError) {
      if (inviteError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este e-mail já possui uma conta cadastrada.' },
          { status: 409 }
        );
      }
      console.error('[INVITE] Erro ao gerar link:', inviteError);
      return NextResponse.json(
        { error: 'Erro ao gerar convite. Tente novamente.' },
        { status: 500 }
      );
    }

    const actionLink = inviteData?.properties?.action_link ?? null;

    // Enviar email via Resend SDK (bypassa SMTP do Supabase)
    if (actionLink) {
      const { error: emailError } = await sendInviteEmail({
        to: emailNorm,
        inviteLink: actionLink,
        perfil,
        convidadoPor: adminProfile.nome ?? user.email ?? 'Administrador',
      });

      if (emailError) {
        console.error('[INVITE] Erro ao enviar email via Resend:', emailError);
        // Não falha a requisição — retorna o link para o admin copiar manualmente
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
