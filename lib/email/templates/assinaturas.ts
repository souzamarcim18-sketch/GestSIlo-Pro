const LOGO_URL = 'https://gestsilo.com.br/logo_verde.png';
const COR_DESTAQUE = '#738D45';
const FUNDO = '#f5f5f0';

function layoutBase(conteudo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:${FUNDO};font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <!-- Logo -->
    <div style="text-align:center;padding:24px 0 16px">
      <img src="${LOGO_URL}" alt="GestSilo" width="140" height="33"
           style="display:inline-block;height:33px;width:auto"/>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;border:1px solid #dde3d8;overflow:hidden">
      ${conteudo}

      <!-- Rodapé -->
      <div style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9faf7">
        <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.7">
          GestSilo · Gestão Agrícola Profissional<br/>
          <a href="https://gestsilo.com.br" style="color:${COR_DESTAQUE};text-decoration:none">gestsilo.com.br</a>
          &nbsp;·&nbsp;
          <a href="https://gestsilo.com.br/descadastrar" style="color:#9ca3af;text-decoration:none">Cancelar recebimento</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function botaoPrimario(href: string, texto: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:${COR_DESTAQUE};color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none">
    ${texto}
  </a>`;
}

// ─── Template 1: Confirmação de assinatura ───────────────────────────────────

export function emailConfirmacaoAssinatura({
  nomeProdutor,
  plano,
  dataRenovacao,
  dashboardUrl,
}: {
  nomeProdutor: string;
  plano: string;
  dataRenovacao: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const planoLabel = plano.charAt(0).toUpperCase() + plano.slice(1);

  const html = layoutBase(`
    <div style="padding:32px 32px 8px">
      <h1 style="font-size:20px;color:#111827;margin:0 0 16px;font-weight:700">
        Bem-vindo ao GestSilo ${planoLabel}!
      </h1>
      <p style="color:#374151;font-size:15px;margin:0 0 12px;line-height:1.7">
        Olá, <strong>${nomeProdutor}</strong>!
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.7">
        Sua assinatura do plano <strong>${planoLabel}</strong> está ativa.
        Agora você tem acesso completo a todos os recursos disponíveis no seu plano.
      </p>

      <div style="background:#f0f5eb;border-radius:8px;padding:16px 20px;margin:0 0 28px">
        <p style="margin:0 0 6px;font-size:14px;color:#374151">
          <strong>Plano:</strong> ${planoLabel}
        </p>
        <p style="margin:0;font-size:14px;color:#374151">
          <strong>Próxima renovação:</strong> ${dataRenovacao}
        </p>
      </div>

      ${botaoPrimario(dashboardUrl, 'Acessar minha conta')}

      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.6">
        Dúvidas? Responda este email ou acesse o suporte direto no painel.
      </p>
    </div>
    <div style="padding:8px 32px 32px"></div>
  `);

  return {
    subject: `Bem-vindo ao GestSilo ${planoLabel}! Sua assinatura está ativa`,
    html,
  };
}

// ─── Template 2: Falha de pagamento ─────────────────────────────────────────

export function emailFalhaPagamento({
  nomeProdutor,
  plano,
  portalUrl,
}: {
  nomeProdutor: string;
  plano: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const planoLabel = plano.charAt(0).toUpperCase() + plano.slice(1);

  const html = layoutBase(`
    <div style="padding:32px 32px 8px">
      <!-- Faixa de aviso -->
      <div style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:0 6px 6px 0;padding:12px 16px;margin:0 0 24px">
        <p style="color:#92400e;font-weight:700;margin:0;font-size:14px">Ação necessária</p>
        <p style="color:#92400e;margin:4px 0 0;font-size:13px">Seu pagamento não foi processado</p>
      </div>

      <h1 style="font-size:20px;color:#111827;margin:0 0 16px;font-weight:700">
        Pagamento não processado
      </h1>
      <p style="color:#374151;font-size:15px;margin:0 0 12px;line-height:1.7">
        Olá, <strong>${nomeProdutor}</strong>!
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.7">
        Não conseguimos processar o pagamento da sua assinatura <strong>${planoLabel}</strong>.
        Isso pode acontecer por cartão vencido, limite excedido ou dados desatualizados.
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 28px;line-height:1.7">
        Para manter seu acesso, atualize sua forma de pagamento nos próximos
        <strong>7 dias</strong>.
      </p>

      ${botaoPrimario(portalUrl, 'Atualizar forma de pagamento')}

      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.6">
        Se já atualizou seus dados, pode ignorar este email.
        Em caso de dúvidas, responda esta mensagem.
      </p>
    </div>
    <div style="padding:8px 32px 32px"></div>
  `);

  return {
    subject: 'Ação necessária: pagamento do GestSilo não processado',
    html,
  };
}

// ─── Template 3: Assinatura cancelada ───────────────────────────────────────

export function emailAssinaturaCancelada({
  nomeProdutor,
  plano,
  reativarUrl,
}: {
  nomeProdutor: string;
  plano: string;
  reativarUrl: string;
}): { subject: string; html: string } {
  const planoLabel = plano.charAt(0).toUpperCase() + plano.slice(1);

  const html = layoutBase(`
    <div style="padding:32px 32px 8px">
      <h1 style="font-size:20px;color:#111827;margin:0 0 16px;font-weight:700">
        Assinatura cancelada
      </h1>
      <p style="color:#374151;font-size:15px;margin:0 0 12px;line-height:1.7">
        Olá, <strong>${nomeProdutor}</strong>!
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.7">
        Sua assinatura do plano <strong>${planoLabel}</strong> foi cancelada.
        Sentimos muito por isso.
      </p>

      <div style="background:#f0f5eb;border-radius:8px;padding:16px 20px;margin:0 0 28px">
        <p style="margin:0 0 6px;font-size:14px;color:#374151;font-weight:700">O que acontece agora?</p>
        <ul style="margin:8px 0 0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8">
          <li>Seus dados ficam preservados no plano gratuito</li>
          <li>Você continua com acesso a até 2 silos e 1 simulação</li>
          <li>Pode reativar a qualquer momento sem perder histórico</li>
        </ul>
      </div>

      ${botaoPrimario(reativarUrl, 'Reativar minha assinatura')}

      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.6">
        Se o cancelamento foi por engano ou quer conversar sobre o que podemos melhorar,
        responda este email.
      </p>
    </div>
    <div style="padding:8px 32px 32px"></div>
  `);

  return {
    subject: 'Sua assinatura GestSilo foi cancelada',
    html,
  };
}

// ─── Template 4: Renovação bem-sucedida ─────────────────────────────────────

export function emailRenovacaoSucesso({
  nomeProdutor,
  plano,
  dataProximaRenovacao,
  dashboardUrl,
}: {
  nomeProdutor: string;
  plano: string;
  dataProximaRenovacao: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const planoLabel = plano.charAt(0).toUpperCase() + plano.slice(1);

  const html = layoutBase(`
    <div style="padding:32px 32px 8px">
      <h1 style="font-size:20px;color:#111827;margin:0 0 16px;font-weight:700">
        Assinatura renovada com sucesso
      </h1>
      <p style="color:#374151;font-size:15px;margin:0 0 12px;line-height:1.7">
        Olá, <strong>${nomeProdutor}</strong>!
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.7">
        Sua assinatura <strong>${planoLabel}</strong> foi renovada.
        Tudo certo para mais um período de gestão profissional.
      </p>

      <div style="background:#f0f5eb;border-radius:8px;padding:16px 20px;margin:0 0 28px">
        <p style="margin:0 0 6px;font-size:14px;color:#374151">
          <strong>Plano:</strong> ${planoLabel}
        </p>
        <p style="margin:0;font-size:14px;color:#374151">
          <strong>Próxima renovação:</strong> ${dataProximaRenovacao}
        </p>
      </div>

      ${botaoPrimario(dashboardUrl, 'Acessar minha conta')}

      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.6">
        O recibo desta cobrança está disponível no portal de assinatura do painel.
      </p>
    </div>
    <div style="padding:8px 32px 32px"></div>
  `);

  return {
    subject: 'Assinatura GestSilo renovada com sucesso',
    html,
  };
}
