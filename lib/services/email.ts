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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu-secret-aqui') as { agendamento_id: string; tipo: string };
    return {
      agendamento_id: decoded.agendamento_id,
      tipo: decoded.tipo,
    };
  } catch {
    return null;
  }
}

