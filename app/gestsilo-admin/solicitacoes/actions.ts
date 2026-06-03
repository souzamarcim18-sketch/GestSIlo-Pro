'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getAdminSession } from '@/lib/admin-auth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = getAdminSession(cookieStore);
  if (!session) throw new Error('Não autorizado');
  return session;
}

export async function aprovarSolicitacao(
  id: string,
  email: string,
  nome: string,
  observacoes: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();
  } catch {
    return { success: false, error: 'Não autorizado' };
  }

  const supabase = getServiceClient();

  const { error: updateError } = await supabase
    .from('solicitacoes_acesso')
    .update({ status: 'aprovada', aprovado_em: new Date().toISOString(), observacoes: observacoes || null })
    .eq('id', id);

  if (updateError) {
    console.error('aprovarSolicitacao: update error', updateError.message);
    return { success: false, error: 'Erro ao atualizar solicitação' };
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`;

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { nome_solicitante: nome },
  });

  if (inviteError) {
    console.error('aprovarSolicitacao: invite error', inviteError.message);
  } else {
    await supabase
      .from('solicitacoes_acesso')
      .update({ invite_enviado_em: new Date().toISOString() })
      .eq('id', id);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'noreply@gestsilo.com.br',
    to: email,
    subject: 'Seu acesso ao GestSilo foi aprovado!',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #161616; color: #e5e7eb; border-radius: 12px; padding: 32px; border: 1px solid #2a2a2a;">
        <div style="margin-bottom: 24px;">
          <img src="https://gestsilo.com.br/logo_verde.png" alt="GestSilo" height="32" style="object-fit: contain;" />
        </div>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px;">Bem-vindo ao GestSilo, ${nome}!</h2>
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 16px;">Sua solicitação de acesso foi aprovada. Você receberá um e-mail separado com o link para criar sua senha.</p>
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 16px;">Clique no link do e-mail de convite para definir sua senha e começar a usar a plataforma.</p>
        ${observacoes ? `<p style="color: #9ca3af; font-size: 14px; margin: 0 0 16px;"><strong style="color: #e5e7eb;">Observação:</strong> ${observacoes}</p>` : ''}
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px;">Em caso de dúvidas, entre em contato com nosso suporte respondendo este e-mail.</p>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #2a2a2a;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">GestSilo · Gestão Agrícola Profissional</p>
        </div>
      </div>
    `,
  });

  return { success: true };
}

export async function rejeitarSolicitacao(
  id: string,
  motivo: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();
  } catch {
    return { success: false, error: 'Não autorizado' };
  }

  const supabase = getServiceClient();

  const { error } = await supabase
    .from('solicitacoes_acesso')
    .update({ status: 'rejeitada', rejeitado_em: new Date().toISOString(), observacoes: motivo })
    .eq('id', id);

  if (error) {
    console.error('rejeitarSolicitacao: error', error.message);
    return { success: false, error: 'Erro ao rejeitar solicitação' };
  }

  return { success: true };
}
