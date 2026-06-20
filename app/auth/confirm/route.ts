import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Garante que o profile existe no banco após confirmação de email.
// O trigger on_auth_user_created deveria ter criado, mas pode falhar ou
// ter sido criado antes do trigger existir. Upsert defensivo via service role.
async function ensureProfile(userId: string, email: string, userMeta: Record<string, unknown>) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const nome = (userMeta.nome as string) || (userMeta.full_name as string) || email.split('@')[0];
  const perfil = (userMeta.perfil as string) || 'Administrador';
  const fazenda_id = (userMeta.fazenda_id as string) || null;
  await admin.from('profiles').upsert(
    { id: userId, email, nome, perfil, fazenda_id },
    { onConflict: 'id', ignoreDuplicates: true }
  );
}

// Recebe o redirect do Supabase após verificar o token em supabase.co/auth/v1/verify
// O Supabase pode enviar: token_hash (PKCE) ou access_token+refresh_token (implicit)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const access_token = searchParams.get('access_token');
  const refresh_token = searchParams.get('refresh_token');
  const error_code = searchParams.get('error_code');
  const error_description = searchParams.get('error_description');

  // Supabase retornou erro no redirect
  if (error_code) {
    console.error('[AUTH CONFIRM] Supabase error:', error_code, error_description);
    return NextResponse.redirect(new URL('/login?error=link_expirado', request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  // Fluxo 1: token_hash (PKCE) — gerado por generateLink no servidor
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'invite' | 'recovery' | 'email',
      token_hash,
    });

    if (error) {
      console.error('[AUTH CONFIRM] verifyOtp error:', error.message);
      return NextResponse.redirect(new URL('/login?error=link_expirado', request.url));
    }

    // Garante que o profile existe — o trigger pode ter falhado silenciosamente
    const { data: { user: confirmedUser } } = await supabase.auth.getUser();
    if (confirmedUser && type === 'email') {
      await ensureProfile(confirmedUser.id, confirmedUser.email ?? '', confirmedUser.user_metadata ?? {});
    }

    const redirectTo =
      type === 'recovery' ? '/reset-password'
      : type === 'invite' ? '/auth/set-password'
      : '/dashboard/onboarding';
    // Nota: recovery normalmente chega via hash em /auth/callback (fluxo implícito).
    // Mantemos o caso aqui para o eventual fluxo PKCE (token_hash na query string).

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    cookieStore.getAll().forEach(({ name, value }) => {
      response.cookies.set(name, value);
    });
    return response;
  }

  // Fluxo 2: access_token + refresh_token (implicit) — Supabase processou o token
  // e redirecionou aqui já com a sessão estabelecida
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      console.error('[AUTH CONFIRM] setSession error:', error.message);
      return NextResponse.redirect(new URL('/login?error=link_expirado', request.url));
    }

    const { data: { user } } = await supabase.auth.getUser();
    // Garante que o profile existe
    if (user) {
      await ensureProfile(user.id, user.email ?? '', user.user_metadata ?? {});
    }

    const isInvite = user?.app_metadata?.convidado_por != null;
    const redirectTo = isInvite ? '/auth/set-password' : '/dashboard/onboarding';

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    cookieStore.getAll().forEach(({ name, value }) => {
      response.cookies.set(name, value);
    });
    return response;
  }

  // Nenhum parâmetro válido
  return NextResponse.redirect(new URL('/login?error=link_invalido', request.url));
}
