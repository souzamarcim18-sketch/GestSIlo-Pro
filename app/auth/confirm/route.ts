import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Processa o token do link de convite/reset e redireciona com sessão ativa
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=link_invalido', request.url));
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

  const { error } = await supabase.auth.verifyOtp({
    type: type as 'invite' | 'recovery' | 'email',
    token_hash,
  });

  if (error) {
    console.error('[AUTH CONFIRM] verifyOtp error:', error.message);
    return NextResponse.redirect(new URL('/login?error=link_expirado', request.url));
  }

  // Token válido — redireciona para definir senha
  // (para recovery também cai aqui e vai para set-password)
  const redirectTo = type === 'invite' || type === 'recovery'
    ? '/auth/set-password'
    : '/dashboard';

  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  // Propagar cookies de sessão para o response de redirect
  cookieStore.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });

  return response;
}
