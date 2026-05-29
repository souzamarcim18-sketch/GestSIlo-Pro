'use server';

import { createSupabaseServerClient } from './server';
import type { AnimalParaLote } from '@/lib/types/rebanho-lote';

export async function listAnimaisAtivosParaLote(): Promise<AnimalParaLote[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('animais')
    .select(
      'id, brinco, nome, sexo, categoria, lote_id, peso_atual, lotes(nome)'
    )
    .eq('status', 'Ativo')
    .is('deleted_at', null)
    .order('brinco', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((a) => ({
    id: a.id,
    brinco: a.brinco,
    nome: a.nome,
    sexo: a.sexo as 'Macho' | 'Fêmea',
    categoria: a.categoria,
    lote_id: a.lote_id,
    // Supabase JS infere lotes como array mesmo sendo many-to-one — cast necessário
    lote_nome:
      (a.lotes as unknown as { nome: string } | null)?.nome ?? null,
    peso_atual: a.peso_atual,
  }));
}
