'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { gerarToken, verificarSenha, setAdminCookie } from '@/lib/admin-auth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function loginAdmin(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const senha = String(formData.get('senha') ?? '');

  if (!email || !senha) {
    return { error: 'Email ou senha incorretos' };
  }

  const supabase = getServiceClient();

  const { data: admin, error } = await supabase
    .from('gestsilo_admins')
    .select('id, senha_hash, ativo')
    .eq('email', email)
    .single();

  if (error || !admin) {
    return { error: 'Email ou senha incorretos' };
  }

  if (!admin.ativo) {
    return { error: 'Email ou senha incorretos' };
  }

  const senhaOk = await verificarSenha(senha, admin.senha_hash);
  if (!senhaOk) {
    return { error: 'Email ou senha incorretos' };
  }

  const token = gerarToken(admin.id);

  // Atualiza ultimo_login (fire-and-forget — falha não bloqueia login)
  void supabase
    .from('gestsilo_admins')
    .update({ ultimo_login: new Date().toISOString() })
    .eq('id', admin.id);

  // Seta cookie via NextResponse temporário para extrair o Set-Cookie header
  const tempResponse = new NextResponse();
  setAdminCookie(tempResponse, token);
  const setCookieHeader = tempResponse.headers.get('set-cookie');

  if (setCookieHeader) {
    const cookieStore = await cookies();
    // Parseia manualmente o cookie para usar a API de cookies do Next.js
    const [nameVal, ...parts] = setCookieHeader.split(';');
    const [cookieName, cookieValue] = nameVal.split('=');
    const cookieOptions: Parameters<typeof cookieStore.set>[2] = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',
    };
    void parts; // atributos já estão em cookieOptions
    cookieStore.set(cookieName.trim(), cookieValue?.trim() ?? '', cookieOptions);
  }

  redirect('/gestsilo-admin');
}
