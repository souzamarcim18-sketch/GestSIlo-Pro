import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'GestSilo <noreply@gestsilo.com.br>';

export async function sendInviteEmail({
  to,
  perfil,
  convidadoPor,
  senhaTemporaria,
  loginUrl,
}: {
  to: string;
  perfil: string;
  convidadoPor: string;
  senhaTemporaria: string;
  loginUrl: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Você foi convidado para o GestSilo Pro',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:0">
        <div style="background:#00A651;padding:28px 32px;border-radius:12px 12px 0 0">
          <p style="color:#fff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.5px">GestSilo Pro</p>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">Plataforma de Gestão Agrícola</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <h1 style="font-size:20px;color:#111827;margin:0 0 12px">Você foi convidado!</h1>
          <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6">
            <strong>${convidadoPor}</strong> convidou você para acessar o <strong>GestSilo Pro</strong> como <strong>${perfil}</strong>.
          </p>
          <p style="color:#374151;font-size:15px;margin:0 0 8px;line-height:1.6">
            Use as credenciais abaixo para fazer seu primeiro acesso:
          </p>
          <div style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin:0 0 24px">
            <p style="margin:0 0 8px;font-size:14px;color:#374151">
              <strong>E-mail:</strong> ${to}
            </p>
            <p style="margin:0;font-size:14px;color:#374151">
              <strong>Senha temporária:</strong>
              <span style="font-family:monospace;font-size:16px;color:#111827;letter-spacing:1px"> ${senhaTemporaria}</span>
            </p>
          </div>
          <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.6">
            Ao entrar, você será solicitado a criar uma senha pessoal.
          </p>
          <a href="${loginUrl}"
             style="display:inline-block;background:#00A651;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none">
            Acessar o GestSilo Pro
          </a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>
          <p style="color:#9ca3af;font-size:12px;margin:0">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </div>
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
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:0">
        <div style="background:#00A651;padding:28px 32px;border-radius:12px 12px 0 0">
          <p style="color:#fff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.5px">GestSilo Pro</p>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">Plataforma de Gestão Agrícola</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <h1 style="font-size:20px;color:#111827;margin:0 0 12px">Redefinir senha</h1>
          <p style="color:#374151;font-size:15px;margin:0 0 28px;line-height:1.6">
            Recebemos uma solicitação para redefinir a senha da sua conta no GestSilo Pro.<br/>
            Clique no botão abaixo para criar uma nova senha.
          </p>
          <a href="${resetLink}"
             style="display:inline-block;background:#00A651;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none">
            Redefinir senha
          </a>
          <p style="color:#374151;font-size:14px;margin:28px 0 0;line-height:1.6">
            Se você não solicitou a redefinição, ignore este email — sua senha permanece a mesma.
          </p>
          <p style="color:#6b7280;font-size:13px;margin:16px 0 0;line-height:1.6">
            Se o botão não funcionar, copie e cole este link no navegador:<br/>
            <a href="${resetLink}" style="color:#00A651;word-break:break-all">${resetLink}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>
          <p style="color:#9ca3af;font-size:12px;margin:0">
            © 2026 GestSilo · Todos os direitos reservados
          </p>
        </div>
      </div>
    `,
  });
}
