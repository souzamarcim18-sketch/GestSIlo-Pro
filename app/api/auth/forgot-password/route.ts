import { createClient } from '@supabase/supabase-js';
import { forgotPasswordRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { success, remaining, resetIn } = await checkRateLimit(forgotPasswordRateLimit, ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas de recuperação de senha. Tente novamente em algumas horas.',
          resetIn,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const { email, redirectUrl } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'E-mail é obrigatório.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const siteUrl = redirectUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resetUrl = `${siteUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: resetUrl,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao enviar e-mail de recuperação.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de recuperação enviado. Verifique sua caixa de entrada.',
    });
  } catch (error) {
    console.error('Erro na rota de recuperação de senha:', error);
    return NextResponse.json(
      { error: 'Erro ao processar recuperação. Tente novamente.' },
      { status: 500 }
    );
  }
}
