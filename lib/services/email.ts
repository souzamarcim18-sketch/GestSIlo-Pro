import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'seu-secret-aqui');
}

export async function gerarTokenConfirmacao(
  agendamentoId: string,
  tipo: 'confirmar' | 'recusar' | 'remarcar'
): Promise<string> {
  return new SignJWT({ agendamento_id: agendamentoId, tipo })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret());
}

export async function verificarTokenConfirmacao(
  token: string
): Promise<{ agendamento_id: string; tipo: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.agendamento_id !== 'string' || typeof payload.tipo !== 'string') return null;
    return { agendamento_id: payload.agendamento_id, tipo: payload.tipo };
  } catch {
    return null;
  }
}
