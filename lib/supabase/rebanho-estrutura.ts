'use server';

// Serviço de Estrutura/Composição do rebanho (Fase 4 — SPEC-rebanho345 §7.3.1,
// P4.2). Lê o efetivo ATIVO e delega à função pura `calcularEstruturaRebanho`,
// que usa a fonte única de categorias (D-4.2). Sem materialização no banco.

import { createSupabaseServerClient } from './server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  calcularEstruturaRebanho,
  type EstruturaRebanho,
} from '@/lib/calculos/indicadores-rebanho';
import type { Animal } from '@/lib/types/rebanho';

/**
 * Estrutura/Composição do rebanho ativo da fazenda autenticada.
 *
 * Snapshot: considera apenas `status = 'Ativo'` e `deleted_at IS NULL`.
 * Organiza por categoria, sexo, sistema (tipo_rebanho), faixa etária e lote.
 */
export async function getEstruturaRebanho(): Promise<EstruturaRebanho> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getCurrentFazendaId();

  const [animaisRes, lotesRes] = await Promise.all([
    supabase
      .from('animais')
      .select('id, categoria, sexo, tipo_rebanho, lote_id')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null),
    supabase
      .from('lotes')
      .select('id, nome')
      .eq('fazenda_id', fazendaId),
  ]);

  const animais = (animaisRes.data ?? []) as Pick<
    Animal,
    'categoria' | 'sexo' | 'tipo_rebanho' | 'lote_id'
  >[];

  const nomePorLote = new Map<string, string>();
  for (const lote of (lotesRes.data ?? []) as { id: string; nome: string }[]) {
    nomePorLote.set(lote.id, lote.nome);
  }

  const estrutura = calcularEstruturaRebanho(animais, nomePorLote);
  return JSON.parse(JSON.stringify(estrutura)) as EstruturaRebanho;
}
