'use server';

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { solicitarAcessoSchema } from '@/lib/validations/solicitar-acesso';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function solicitarAcessoAction(formData: unknown) {
  const parsed = solicitarAcessoSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: 'Dados inválidos' };
  }

  const { nome, email, fazenda, whatsapp, plano } = parsed.data;

  // Usa cliente anônimo — RLS permite INSERT para anon nesta tabela
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: dbError } = await supabase
    .from('solicitacoes_acesso')
    .insert({ nome, email, nome_fazenda: fazenda, whatsapp, plano });

  if (dbError) {
    console.error('solicitarAcessoAction: db error', dbError.message);
    return { error: 'Erro ao registrar solicitação. Tente novamente.' };
  }

  const dataHora = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  await resend.emails.send({
    from: 'noreply@gestsilo.com.br',
    to: 'souza.marcim18@gmail.com',
    subject: `Nova solicitação de acesso — ${nome} / ${fazenda}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #161616; color: #e5e7eb; border-radius: 12px; padding: 32px; border: 1px solid #2a2a2a;">
        <div style="margin-bottom: 24px;">
          <img src="https://gestsilo.com.br/logo_verde.png" alt="GestSilo" height="32" style="object-fit: contain;" />
        </div>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">Nova solicitação de acesso</h2>
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px;">Recebida em ${dataHora}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${[
            ['Nome', nome],
            ['E-mail', email],
            ['Fazenda', fazenda],
            ['WhatsApp', whatsapp],
            ['Plano', plano],
          ]
            .map(
              ([label, value]) => `
            <tr>
              <td style="padding: 10px 0; color: #9ca3af; width: 110px; vertical-align: top;">${label}</td>
              <td style="padding: 10px 0; color: #ffffff; font-weight: 600;">${value}</td>
            </tr>
          `,
            )
            .join('')}
        </table>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #2a2a2a;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">GestSilo · Painel Admin</p>
        </div>
      </div>
    `,
  });

  return { success: true };
}
