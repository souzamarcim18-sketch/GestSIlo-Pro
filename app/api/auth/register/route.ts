import { createClient } from '@supabase/supabase-js';
import { registerRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { registerSchema } from '@/lib/validations/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { success, remaining, resetIn } = await checkRateLimit(registerRateLimit, ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.',
          resetIn,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { email, password, nome } = parsed.data;
    const { perfil } = body as { perfil?: string };

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gestsilo.com.br';

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          nome,
          perfil: perfil || 'Administrador',
        },
        emailRedirectTo: `${siteUrl}/auth/confirm`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao realizar cadastro.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
    });
  } catch (error) {
    console.error('Erro na rota de registro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar cadastro. Tente novamente.' },
      { status: 500 }
    );
  }
}
