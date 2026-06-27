'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const configuracoesPesosSchema = z.object({
  peso_concha_ton: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive('Deve ser maior que zero').nullable()
  ),
  peso_vagao_ton: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive('Deve ser maior que zero').nullable()
  ),
});

export async function salvarConfiguracoesPesosAction(formData: {
  peso_concha_ton: string | null;
  peso_vagao_ton: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = configuracoesPesosSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const client = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return { success: false, error: 'Não autenticado' };

  const { data: profile } = await client
    .from('profiles')
    .select('perfil, fazenda_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.perfil !== 'Administrador') {
    return { success: false, error: 'Acesso negado' };
  }

  const { error } = await client
    .from('configuracoes_fazenda')
    .upsert(
      {
        fazenda_id: profile.fazenda_id,
        peso_concha_ton: parsed.data.peso_concha_ton,
        peso_vagao_ton: parsed.data.peso_vagao_ton,
      },
      { onConflict: 'fazenda_id' }
    );

  if (error) return { success: false, error: 'Erro ao salvar configurações' };

  revalidatePath('/dashboard/configuracoes');
  return { success: true };
}

export async function removerUsuarioAction(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (!targetUserId) return { success: false, error: 'ID inválido' };

  const client = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return { success: false, error: 'Não autenticado' };

  if (user.id === targetUserId) {
    return { success: false, error: 'Você não pode remover a si mesmo.' };
  }

  const { data: adminProfile } = await client
    .from('profiles')
    .select('perfil, fazenda_id')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.perfil !== 'Administrador') {
    return { success: false, error: 'Acesso negado' };
  }

  // Verificar que o alvo pertence à mesma fazenda
  const { data: targetProfile } = await client
    .from('profiles')
    .select('fazenda_id')
    .eq('id', targetUserId)
    .single();

  if (!targetProfile || targetProfile.fazenda_id !== adminProfile.fazenda_id) {
    return { success: false, error: 'Usuário não encontrado nesta fazenda.' };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'Serviço não configurado.' };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Deletar de auth.users — o cascade/trigger limpa profiles automaticamente
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    console.error('[REMOVE_USER] Erro ao deletar usuário:', deleteError);
    return { success: false, error: 'Erro ao remover usuário. Tente novamente.' };
  }

  // Garantia: limpar profile caso o cascade não tenha rodado
  await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

  revalidatePath('/dashboard/configuracoes');
  return { success: true };
}
