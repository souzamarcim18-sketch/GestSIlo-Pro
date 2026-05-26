'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';

export interface EventoSanitarioRelatorio {
  id: string;
  animal_brinco: string;
  animal_nome: string | null;
  lote_nome: string | null;
  tipo: string;
  data_evento: string;
  produto_medicamento: string | null;
  dose: string | null;
  via_aplicacao: string | null;
  veterinario: string | null;
  observacoes: string | null;
  proxima_data: string | null;
}

type RawEvento = {
  id: string;
  tipo: string;
  data_evento: string;
  produto_medicamento: string | null;
  dose: string | null;
  via_aplicacao: string | null;
  veterinario: string | null;
  observacoes: string | null;
  proxima_data: string | null;
  animais: {
    brinco: string;
    nome: string | null;
    lotes: { nome: string } | { nome: string }[] | null;
  } | {
    brinco: string;
    nome: string | null;
    lotes: { nome: string } | { nome: string }[] | null;
  }[] | null;
};

function resolveLoteNome(lotes: { nome: string } | { nome: string }[] | null): string | null {
  if (!lotes) return null;
  if (Array.isArray(lotes)) return lotes[0]?.nome ?? null;
  return lotes.nome;
}

function resolveAnimal(animais: RawEvento['animais']): { brinco: string; nome: string | null; lote_nome: string | null } {
  if (!animais) return { brinco: '', nome: null, lote_nome: null };
  const a = Array.isArray(animais) ? animais[0] : animais;
  if (!a) return { brinco: '', nome: null, lote_nome: null };
  return {
    brinco: a.brinco,
    nome: a.nome,
    lote_nome: resolveLoteNome(a.lotes),
  };
}

export async function getHistoricoSanitario(
  fazendaId: string,
  from: Date,
  to: Date,
  filtros?: {
    lote_id?: string;
    categoria_animal?: string;
    tipo_evento?: string;
  }
): Promise<EventoSanitarioRelatorio[]> {
  const supabase = await createSupabaseServerClient();
  const { gte, lte } = toUtcRangeFromLocal(from, to);

  let query = supabase
    .from('eventos_sanitarios')
    .select('id, tipo, data_evento, produto_medicamento, dose, via_aplicacao, veterinario, observacoes, proxima_data, animais(brinco, nome, lotes(nome))')
    .eq('fazenda_id', fazendaId)
    .gte('data_evento', gte)
    .lte('data_evento', lte)
    .order('data_evento', { ascending: false })
    .limit(10000);

  if (filtros?.tipo_evento) {
    query = query.eq('tipo', filtros.tipo_evento);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawEvento[]).map((e) => {
    const animal = resolveAnimal(e.animais);
    return {
      id: e.id,
      animal_brinco: animal.brinco,
      animal_nome: animal.nome,
      lote_nome: animal.lote_nome,
      tipo: e.tipo,
      data_evento: e.data_evento,
      produto_medicamento: e.produto_medicamento,
      dose: e.dose,
      via_aplicacao: e.via_aplicacao,
      veterinario: e.veterinario,
      observacoes: e.observacoes,
      proxima_data: e.proxima_data,
    };
  });
}
