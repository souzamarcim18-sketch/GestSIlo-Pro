import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

    const redirectTo = type === 'invite' || type === 'recovery'
      ? '/auth/set-password'
      : '/dashboard';

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
    // Se o usuário não tem senha definida (convidado), vai para set-password
    // Caso contrário vai para o dashboard
    const isInvite = user?.app_metadata?.provider === 'email' &&
      !user?.last_sign_in_at;

    const redirectTo = isInvite ? '/auth/set-password' : '/dashboard';

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    cookieStore.getAll().forEach(({ name, value }) => {
      response.cookies.set(name, value);
    });
    return response;
  }

  // Nenhum parâmetro válido
  return NextResponse.redirect(new URL('/login?error=link_invalido', request.url));
}
