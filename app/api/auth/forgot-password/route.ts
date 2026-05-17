import { createClient } from '@supabase/supabase-js';
import { forgotPasswordRateLimit, checkRateLimit, getClientIP } from '@/lib/auth/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email/resend';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { success, resetIn } = await checkRateLimit(forgotPasswordRateLimit, ip);

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

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'E-mail é obrigatório.' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Serviço não configurado. Contate o suporte.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const emailNorm = email.trim().toLowerCase();

    // Gera o link de recovery via service role (retorna o link diretamente)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: emailNorm,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      // Não revelar se o email existe ou não (segurança)
      console.error('[FORGOT-PASSWORD] Erro ao gerar link:', error.message);
      return NextResponse.json({
        success: true,
        message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.',
      });
    }

    const resetLink = data?.properties?.action_link;

    if (resetLink) {
      const { error: emailError } = await sendPasswordResetEmail({
        to: emailNorm,
        resetLink,
      });

      if (emailError) {
        console.error('[FORGOT-PASSWORD] Erro ao enviar email via Resend:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.',
    });
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar recuperação. Tente novamente.' },
      { status: 500 }
    );
  }
}
