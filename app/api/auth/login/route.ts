import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { loginRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { loginSchema } from '@/lib/validations/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let response = NextResponse.json({ success: false }, { status: 500 });

  try {
    const ip = getClientIP(request);
    const { success, remaining, resetIn } = await checkRateLimit(loginRateLimit, ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
          resetIn,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 });
    }
    const { email, password } = parsed.data;

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Retorna sucesso — o client (página de login) faz o redirect por perfil
    const successResponse = NextResponse.json({ success: true });

    // Propaga cookies de sessão para o response
    const cookieList = cookieStore.getAll();
    cookieList.forEach(({ name, value }) => {
      successResponse.cookies.set(name, value);
    });

    return successResponse;
  } catch (error) {
    console.error('Erro na rota de login:', error);
    return NextResponse.json(
      { error: 'Erro ao processar login. Tente novamente.' },
      { status: 500 }
    );
  }
}
