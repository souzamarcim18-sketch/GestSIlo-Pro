'use server';

import { createClient } from '@supabase/supabase-js';

// Garante que o profile existe no banco após confirmação de email.
// O trigger on_auth_user_created deveria ter criado, mas pode falhar ou
// ter sido criado antes do trigger existir. Upsert defensivo via service role.
// Chamado a partir da página client /auth/confirm após a sessão ser estabelecida.
export async function ensureProfileAction(
  userId: string,
  email: string,
  userMeta: Record<string, unknown>,
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const nome = (userMeta.nome as string) || (userMeta.full_name as string) || email.split('@')[0];
  const perfil = (userMeta.perfil as string) || 'Administrador';
  const fazenda_id = (userMeta.fazenda_id as string) || null;

  await admin.from('profiles').upsert(
    { id: userId, email, nome, perfil, fazenda_id },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}
