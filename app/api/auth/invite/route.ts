import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { inviteRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { sendInviteEmail } from '@/lib/email/resend';
import { inviteSchema } from '@/lib/validations/auth';
import { NextRequest, NextResponse } from 'next/server';


function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 10; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

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
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const emailNorm = parsed.data.email.trim().toLowerCase();
    const perfil = parsed.data.perfil;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gestsilo.com.br';
    const senhaTemporaria = gerarSenhaTemporaria();

    // Criar usuário com senha temporária e email já confirmado
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      password: senhaTemporaria,
      email_confirm: true,
      app_metadata: {
        perfil,
        fazenda_id: adminProfile.fazenda_id,
        convidado_por: adminProfile.nome ?? user.email,
        primeiro_acesso: true,
      },
      user_metadata: {
        perfil,
        fazenda_id: adminProfile.fazenda_id,
        nome: '',
        primeiro_acesso: true,
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

    // Criar profile explicitamente — o trigger handle_new_user pode não disparar
    // para usuários criados via admin.createUser
    if (newUserData?.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUserData.user.id,
          email: emailNorm,
          nome: '',
          perfil,
          fazenda_id: adminProfile.fazenda_id,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('[INVITE] Erro ao criar profile:', profileError);
      }
    }

    // Enviar email com credenciais temporárias via Resend
    const { error: emailError } = await sendInviteEmail({
      to: emailNorm,
      perfil,
      convidadoPor: adminProfile.nome ?? user.email ?? 'Administrador',
      senhaTemporaria,
      loginUrl: `${siteUrl}/login`,
    });

    if (emailError) {
      console.error('[INVITE] Erro ao enviar email via Resend:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: `Convite enviado para ${emailNorm}`,
    });

  } catch (error) {
    console.error('[INVITE] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar convite. Tente novamente.' },
      { status: 500 }
    );
  }
}
