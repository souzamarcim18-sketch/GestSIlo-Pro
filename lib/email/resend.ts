import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'GestSilo <noreply@gestsilo.com.br>';

export async function sendInviteEmail({
  to,
  inviteLink,
  perfil,
  convidadoPor,
}: {
  to: string;
  inviteLink: string;
  perfil: string;
  convidadoPor: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Você foi convidado para o GestSilo Pro',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px">
        <img src="https://gestsilo.com.br/logo_degrad-hor.png" alt="GestSilo" style="height:40px;margin-bottom:24px" />
        <h1 style="font-size:20px;color:#111827;margin:0 0 8px">Você foi convidado!</h1>
        <p style="color:#374151;font-size:15px;margin:0 0 8px">
          <strong>${convidadoPor}</strong> convidou você para acessar o <strong>GestSilo Pro</strong> como <strong>${perfil}</strong>.
        </p>
        <p style="color:#374151;font-size:15px;margin:0 0 24px">
          Clique no botão abaixo para criar sua senha e acessar o sistema.
        </p>
        <a href="${inviteLink}"
           style="display:inline-block;background:#00A651;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">
          Aceitar convite
        </a>
        <p style="color:#6b7280;font-size:13px;margin:24px 0 0">
          Se o botão não funcionar, copie e cole este link no navegador:<br/>
          <a href="${inviteLink}" style="color:#00A651;word-break:break-all">${inviteLink}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;margin:0">
          © 2026 GestSilo · Plataforma de Gestão Agrícola
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({
  to,
  resetLink,
}: {
  to: string;
  resetLink: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Redefinição de senha — GestSilo Pro',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px">
        <img src="https://gestsilo.com.br/logo_degrad-hor.png" alt="GestSilo" style="height:40px;margin-bottom:24px" />
        <h1 style="font-size:20px;color:#111827;margin:0 0 8px">Redefinir senha</h1>
        <p style="color:#374151;font-size:15px;margin:0 0 24px">
          Recebemos uma solicitação para redefinir a senha da sua conta no GestSilo Pro.<br/>
          Clique no botão abaixo para criar uma nova senha.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;background:#00A651;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">
          Redefinir senha
        </a>
        <p style="color:#374151;font-size:14px;margin:24px 0 0">
          Se você não solicitou a redefinição, ignore este email — sua senha permanece a mesma.
        </p>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          Se o botão não funcionar, copie e cole este link no navegador:<br/>
          <a href="${resetLink}" style="color:#00A651;word-break:break-all">${resetLink}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;margin:0">
          © 2026 GestSilo · Plataforma de Gestão Agrícola
        </p>
      </div>
    `,
  });
}
