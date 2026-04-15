import { supabase } from '@/lib/supabase';
import type { Fazenda } from '@/lib/supabase';

export interface CreateFazendaInput {
  nome: string;
  localizacao?: string | null;
  area_total?: number | null;
  latitude?: number | null;    // Nova: coordenada geográfica
  longitude?: number | null;   // Nova: coordenada geográfica
}

/**
 * Cria uma fazenda e vincula ao profile do usuário (fazenda_id).
 */
export async function createFazenda(
  userId: string,
  input: CreateFazendaInput
): Promise<Fazenda> {
  // 1. Criar a fazenda (com owner_id)
  const { data: fazenda, error: fazendaError } = await supabase
    .from('fazendas')
    .insert({
      nome: input.nome,
      localizacao: input.localizacao ?? null,
      area_total: input.area_total ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      owner_id: userId, // <-- vincula ao usuário logado
    })
    .select()
    .single();

  if (fazendaError || !fazenda) {
    throw new Error(fazendaError?.message ?? 'Erro ao criar fazenda');
  }

  // 2. Vincular fazenda_id no profile do usuário
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ fazenda_id: fazenda.id })
    .eq('id', userId);

  if (profileError) {
    // Rollback: remove a fazenda criada
    await supabase.from('fazendas').delete().eq('id', fazenda.id);
    throw new Error(profileError.message ?? 'Erro ao vincular fazenda ao perfil');
  }

  return fazenda as Fazenda;
}
