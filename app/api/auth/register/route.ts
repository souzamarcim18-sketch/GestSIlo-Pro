import { createClient } from '@supabase/supabase-js';
import { registerRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
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

    const { email, password, nome, perfil } = await request.json();

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'E-mail, senha e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 8 caracteres.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          nome,
          perfil: perfil || 'Administrador',
        },
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
