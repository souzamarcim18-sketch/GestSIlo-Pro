'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/admin-auth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = await getAdminSession(cookieStore);
  if (!session) throw new Error('Não autorizado');
  return session;
}

const PLANOS_VALIDOS = ['free', 'starter', 'pro', 'max'] as const;
type Plano = (typeof PLANOS_VALIDOS)[number];

export async function alterarPlanoFazenda(
  fazendaId: string,
  planoAnterior: string,
  novoPlano: Plano,
): Promise<{ success: boolean; error?: string }> {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return { success: false, error: 'Não autorizado' };
  }

  if (!PLANOS_VALIDOS.includes(novoPlano)) {
    return { success: false, error: 'Plano inválido' };
  }

  if (!fazendaId) {
    return { success: false, error: 'Fazenda não identificada' };
  }

  const supabase = getServiceClient();

  const { error: fazendaError } = await supabase
    .from('fazendas')
    .update({ plano_atual: novoPlano })
    .eq('id', fazendaId);

  if (fazendaError) {
    console.error('alterarPlanoFazenda: update fazendas error', fazendaError.message);
    return { success: false, error: 'Erro ao atualizar plano da fazenda' };
  }

  const { error: upsertError } = await supabase
    .from('assinaturas')
    .upsert(
      { fazenda_id: fazendaId, plano: novoPlano, status: 'ativa', updated_at: new Date().toISOString() },
      { onConflict: 'fazenda_id' },
    );

  if (upsertError) {
    console.error('alterarPlanoFazenda: upsert assinaturas error', upsertError.message);
    // Não falha — a atualização da fazenda já foi feita, a assinatura é rastreamento auxiliar
  }

  console.info(
    `[gestsilo-admin] Plano alterado por admin ${session.adminId}: fazenda ${fazendaId} | ${planoAnterior} → ${novoPlano}`,
  );

  return { success: true };
}
