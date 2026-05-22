'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type MovimentacaoSiloRow = {
  silo_id: string;
  silo_nome: string;
  tipo: 'Entrada' | 'Saída';
  subtipo: string | null;
  quantidade: number;
  data: string;
};

export type AnimalPorCategoriaRow = {
  categoria: string;
  quantidade: number;
};

type SiloJoin = { nome: string };

type RawEstoqueRow = {
  silo_id: string;
  tipo: string;
  quantidade: number;
  silos: SiloJoin | SiloJoin[] | null;
};

type RawConsumoRow = {
  silo_id: string;
  tipo: string;
  subtipo: string | null;
  quantidade: number;
  data: string;
  silos: SiloJoin | SiloJoin[] | null;
};

function resolveNomeSilo(silos: SiloJoin | SiloJoin[] | null): string {
  if (!silos) return '';
  if (Array.isArray(silos)) return silos[0]?.nome ?? '';
  return silos.nome;
}

export async function getEstoqueSilos(
  supabase: SupabaseClient<Database>
): Promise<Pick<MovimentacaoSiloRow, 'silo_id' | 'tipo' | 'quantidade' | 'silo_nome'>[]> {
  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .select('silo_id, tipo, quantidade, silos(nome)');

  if (error || !data) return [];

  return (data as unknown as RawEstoqueRow[]).map((row) => ({
    silo_id: row.silo_id,
    tipo: row.tipo as 'Entrada' | 'Saída',
    quantidade: row.quantidade,
    silo_nome: resolveNomeSilo(row.silos),
  }));
}

export async function getConsumoPorPeriodo(
  supabase: SupabaseClient<Database>,
  dataCorte: Date
): Promise<MovimentacaoSiloRow[]> {
  const dataCorteStr = dataCorte.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .select('silo_id, tipo, subtipo, quantidade, data, silos(nome)')
    .eq('tipo', 'Saída')
    .gte('data', dataCorteStr)
    .order('data', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as RawConsumoRow[]).map((row) => ({
    silo_id: row.silo_id,
    silo_nome: resolveNomeSilo(row.silos),
    tipo: row.tipo as 'Entrada' | 'Saída',
    subtipo: row.subtipo,
    quantidade: row.quantidade,
    data: row.data,
  }));
}

export async function getAnimaisAtivosPorCategoria(
  supabase: SupabaseClient<Database>
): Promise<AnimalPorCategoriaRow[]> {
  const { data, error } = await supabase
    .from('animais')
    .select('categoria')
    .eq('status', 'Ativo');

  if (error || !data) return [];

  const contagem = new Map<string, number>();
  for (const row of data) {
    if (!row.categoria) continue;
    contagem.set(row.categoria, (contagem.get(row.categoria) ?? 0) + 1);
  }

  return Array.from(contagem.entries()).map(([categoria, quantidade]) => ({
    categoria,
    quantidade,
  }));
}
