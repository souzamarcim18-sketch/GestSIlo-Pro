import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type NextResponse } from 'next/server';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

const COOKIE_NAME = 'gestsilo_admin_token';
const MAX_AGE = 60 * 60 * 8; // 8 horas em segundos

function getSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET não definida');
  return secret;
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(adminId: string): string {
  return jwt.sign({ sub: adminId }, getSecret(), { expiresIn: '8h' });
}

export function verificarToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, getSecret()) as { sub: string };
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function getAdminSession(
  cookies: ReadonlyRequestCookies
): { adminId: string } | null {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verificarToken(token);
  if (!payload) return null;
  return { adminId: payload.sub };
}

export function setAdminCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}
