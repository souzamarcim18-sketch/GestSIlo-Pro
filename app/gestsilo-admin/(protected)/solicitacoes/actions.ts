'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/admin-auth';
import { sendAccessApprovedEmail } from '@/lib/email/resend';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = await getAdminSession(cookieStore);
  if (!session) throw new Error('Não autorizado');
  return session;
}

type ServiceClient = ReturnType<typeof getServiceClient>;

// Gera o link de definição de senha e envia pela Resend.
// 'invite' para conta nova; fallback para 'recovery' se o usuário já existir.
async function gerarEEnviarLinkAcesso(
  supabase: ServiceClient,
  email: string,
  nome: string,
  observacoes: string,
): Promise<{ success: boolean; error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const redirectTo = `${siteUrl}/auth/confirm`;

  let actionLink: string | null = null;

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo, data: { nome } },
  });

  if (inviteError) {
    const alreadyExists =
      inviteError.message?.toLowerCase().includes('already been registered') ||
      inviteError.message?.toLowerCase().includes('already registered') ||
      inviteError.code === 'email_exists';

    if (alreadyExists) {
      // Conta já existe — gera link de recuperação para definir nova senha
      const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });
      if (recoveryError) {
        console.error('gerarEEnviarLinkAcesso: recovery link error', recoveryError.message);
        return { success: false, error: 'Não foi possível gerar o link de acesso. Tente novamente.' };
      }
      actionLink = recoveryData.properties?.action_link ?? null;
    } else {
      console.error('gerarEEnviarLinkAcesso: invite link error', inviteError.message);
      return { success: false, error: 'Não foi possível gerar o link de acesso. Tente novamente.' };
    }
  } else {
    actionLink = inviteData.properties?.action_link ?? null;
  }

  if (!actionLink) {
    console.error('gerarEEnviarLinkAcesso: action_link ausente');
    return { success: false, error: 'Não foi possível gerar o link de acesso. Tente novamente.' };
  }

  const { error: emailError } = await sendAccessApprovedEmail({
    to: email,
    nome,
    actionLink,
    observacoes,
  });

  if (emailError) {
    console.error('gerarEEnviarLinkAcesso: email error', emailError);
    return { success: false, error: 'Não foi possível enviar o e-mail. Tente novamente.' };
  }

  return { success: true };
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

  const linkRes = await gerarEEnviarLinkAcesso(supabase, email, nome, observacoes);
  if (!linkRes.success) {
    return { success: false, error: `Aprovação registrada, mas ${linkRes.error?.toLowerCase()} Use "Reenviar link".` };
  }

  await supabase
    .from('solicitacoes_acesso')
    .update({ invite_enviado_em: new Date().toISOString() })
    .eq('id', id);

  return { success: true };
}

export async function reenviarLink(
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

  const linkRes = await gerarEEnviarLinkAcesso(supabase, email, nome, observacoes);
  if (!linkRes.success) return linkRes;

  await supabase
    .from('solicitacoes_acesso')
    .update({ invite_enviado_em: new Date().toISOString() })
    .eq('id', id);

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

export async function arquivarSolicitacao(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();
  } catch {
    return { success: false, error: 'Não autorizado' };
  }

  const supabase = getServiceClient();

  const { error } = await supabase
    .from('solicitacoes_acesso')
    .update({ status: 'arquivada', arquivada_em: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', id);

  if (error) {
    console.error('arquivarSolicitacao: error', error.message);
    return { success: false, error: 'Erro ao arquivar solicitação' };
  }

  return { success: true };
}

export async function deletarSolicitacao(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();
  } catch {
    return { success: false, error: 'Não autorizado' };
  }

  const supabase = getServiceClient();

  const { error } = await supabase
    .from('solicitacoes_acesso')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deletarSolicitacao: error', error.message);
    return { success: false, error: 'Erro ao deletar solicitação' };
  }

  return { success: true };
}
