import { SupabaseClient } from '@supabase/supabase-js';
import { getDb } from './localDb';

const PREFETCH_TS_KEY = 'gestsilo:prefetch:at';

export async function prefetchDadosCriticos(
  supabase: SupabaseClient,
  fazendaId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await Promise.allSettled([
    // 1. Últimas 100 movimentações de silos
    (async () => {
      const { data } = await supabase
        .from('movimentacoes_silo')
        .select('id, silo_id, tipo, subtipo, quantidade, data, responsavel, observacao, created_at')
        .eq('fazenda_id', fazendaId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) return;
      for (const mov of data) {
        await db.put('movimentacoes_silo', mov as Record<string, unknown>);
      }
    })(),

    // 2. Lista de silos da fazenda
    (async () => {
      const { data } = await supabase
        .from('silos')
        .select('id, nome, tipo, cultura_ensilada, volume_ensilado_ton_mv, capacidade_ton_mv, status')
        .eq('fazenda_id', fazendaId);
      if (!data) return;
      const tx = db.transaction('movimentacoes_silo', 'readwrite');
      // Silos não têm store próprio — serializamos no localStorage para acesso rápido
      localStorage.setItem('gestsilo:prefetch:silos', JSON.stringify(data));
      await tx.done;
    })(),

    // 3. Resumo do rebanho (contagem por categoria)
    (async () => {
      const { data } = await supabase
        .from('animais')
        .select('id, categoria, status, sexo')
        .eq('fazenda_id', fazendaId)
        .eq('status', 'Ativo');
      if (!data) return;
      const resumo = data.reduce<Record<string, number>>((acc, a) => {
        const key = a.categoria ?? 'Sem categoria';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      localStorage.setItem('gestsilo:prefetch:rebanho-resumo', JSON.stringify(resumo));
    })(),
  ]);

  localStorage.setItem(PREFETCH_TS_KEY, String(Date.now()));
}

export function getPrefetchTimestamp(): Date | null {
  const raw = localStorage.getItem(PREFETCH_TS_KEY);
  if (!raw) return null;
  const ts = parseInt(raw, 10);
  return isNaN(ts) ? null : new Date(ts);
}
