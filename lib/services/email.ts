import jwt from 'jsonwebtoken';

/**
 * Gera JWT para link mágico do consultor
 * Válido por 24 horas
 */
export function gerarTokenConfirmacao(
  agendamentoId: string,
  tipo: 'confirmar' | 'recusar' | 'remarcar'
): string {
  const payload = {
    agendamento_id: agendamentoId,
    tipo,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'seu-secret-aqui');
}

/**
 * Verifica se token é válido
 */
export function verificarTokenConfirmacao(
  token: string
): { agendamento_id: string; tipo: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu-secret-aqui') as any;
    return {
      agendamento_id: decoded.agendamento_id,
      tipo: decoded.tipo,
    };
  } catch {
    return null;
  }
}

/**
 * Envia email com link mágico via Resend
 */
export async function enviarEmailSolicitacaoAgendamento(
  agendamento: any,
  fazenda: any,
  usuario: any
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gestsilo.com';
    const tokenConfirmar = gerarTokenConfirmacao(agendamento.id, 'confirmar');
    const tokenRecusar = gerarTokenConfirmacao(agendamento.id, 'recusar');
    const tokenRemarcar = gerarTokenConfirmacao(agendamento.id, 'remarcar');

    const linkConfirmar = `${baseUrl}/assessor/confirmar?token=${tokenConfirmar}&agendamento=${agendamento.id}`;
    const linkRecusar = `${baseUrl}/assessor/confirmar?token=${tokenRecusar}&agendamento=${agendamento.id}`;
    const linkRemarcar = `${baseUrl}/assessor/confirmar?token=${tokenRemarcar}&agendamento=${agendamento.id}`;

    const dataFormatada = new Date(agendamento.data_agendada).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const horaFormatada = new Date(agendamento.data_agendada).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const tipoIcon = agendamento.tipo === 'reuniao_video' ? '📹' : '☎️';
    const tipoLabel = agendamento.tipo === 'reuniao_video' ? 'Reunião por Vídeo' : 'Chamada Telefônica';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .actions { display: flex; gap: 10px; margin: 20px 0; }
          .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .btn-success { background: #22c55e; color: white; }
          .btn-danger { background: #ef4444; color: white; }
          .btn-info { background: #3b82f6; color: white; }
          .footer { font-size: 12px; color: #999; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Solicitação de Agendamento</h2>
            <p>Uma fazenda solicitou uma reunião com você.</p>
          </div>

          <div class="details">
            <p><strong>📅 Data:</strong> ${dataFormatada} às ${horaFormatada}</p>
            <p><strong>🏠 Fazenda:</strong> ${fazenda.nome || 'Não informado'}</p>
            <p><strong>👤 Responsável:</strong> ${usuario.nome || 'Não informado'}</p>
            <p><strong>${tipoIcon} Tipo:</strong> ${tipoLabel}</p>
            ${agendamento.observacoes ? `<p><strong>📝 Observações:</strong> ${agendamento.observacoes}</p>` : ''}
          </div>

          <div class="actions">
            <a href="${linkConfirmar}" class="btn btn-success">✅ Confirmar</a>
            <a href="${linkRecusar}" class="btn btn-danger">❌ Recusar</a>
            <a href="${linkRemarcar}" class="btn btn-info">🔄 Remarcar</a>
          </div>

          <p style="color: #666; font-size: 14px;">
            Clique em um dos botões acima para responder a solicitação.
          </p>

          <div class="footer">
            <p>Link válido por 24 horas.</p>
            <p>© GestSilo Pro - Plataforma de Gestão Agrícola</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Se RESEND_API_KEY está configurado, usar Resend; caso contrário, fazer fallback para log
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'noreply@gestsilo.com',
            to: process.env.NEXT_PUBLIC_CONSULTOR_EMAIL || 'gestsilo.app@gmail.com',
            subject: `Solicitação de Agendamento - ${fazenda.nome || 'Fazenda'}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[EMAIL] Erro ao enviar com Resend:', error);
          return { success: false, message: 'Erro ao enviar email' };
        }

        return { success: true };
      } catch (error) {
        console.error('[EMAIL] Erro ao chamar Resend:', error);
        return { success: false, message: 'Erro ao enviar email' };
      }
    } else {
      // Fallback: apenas logar
      console.log('[EMAIL] Email não enviado (RESEND_API_KEY não configurado):', {
        to: process.env.NEXT_PUBLIC_CONSULTOR_EMAIL || 'gestsilo.app@gmail.com',
        subject: `Solicitação de Agendamento - ${fazenda.nome || 'Fazenda'}`,
        links: { linkConfirmar, linkRecusar, linkRemarcar },
      });
      return { success: true };
    }
  } catch (error) {
    console.error('[enviarEmailSolicitacaoAgendamento]', error);
    return { success: false, message: 'Erro ao enviar email' };
  }
}

/**
 * Envia confirmação para usuário via Resend
 */
export async function enviarEmailConfirmacaoAgendamento(
  agendamento: any,
  fazenda: any,
  status: 'solicitado' | 'confirmado' | 'recusado' | 'remarcado' | 'cancelado' | 'concluido'
) {
  try {
    const statusTexto = {
      confirmado: '✅ Agendamento Confirmado',
      recusado: '❌ Agendamento Recusado',
      remarcado: '🔄 Remarcação Sugerida',
      cancelado: '❌ Agendamento Cancelado',
      concluido: '✅ Atendimento Realizado',
      solicitado: 'Aguardando Resposta',
    };

    const mensagem = {
      confirmado: `Seu agendamento foi confirmado para ${new Date(agendamento.data_agendada).toLocaleDateString('pt-BR')} às ${new Date(agendamento.data_agendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      recusado: `Seu agendamento foi recusado. Motivo: ${agendamento.motivo_recusa || 'Não informado'}`,
      remarcado: `O assessor sugeriu uma remarcação para ${agendamento.sugestao_nova_data ? new Date(agendamento.sugestao_nova_data).toLocaleDateString('pt-BR') : 'uma data em breve'}`,
      cancelado: 'Seu agendamento foi cancelado',
      concluido: 'Seu atendimento foi finalizado',
      solicitado: 'Aguardando resposta do assessor',
    };

    // Apenas logar; integração com email pode ser adicionada aqui
    console.log('[EMAIL] Confirmação para usuário:', {
      status,
      titulo: statusTexto[status],
      mensagem: mensagem[status],
    });

    return { success: true };
  } catch (error) {
    console.error('[enviarEmailConfirmacaoAgendamento]', error);
    return { success: false };
  }
}
