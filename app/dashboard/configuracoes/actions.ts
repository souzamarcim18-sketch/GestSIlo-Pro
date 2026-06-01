'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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
