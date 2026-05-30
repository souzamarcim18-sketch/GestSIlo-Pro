'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type PiqueteAtivoRow = {
  piquete_id: string;
  piquete_nome: string;
  area_ha: number;
  ua_suportada: number | null;
  sistema_pastejo: string;
  especie_forrageira: string | null;
  pastagem_nome: string;
  // ocupação ativa
  ocupacao_id: string | null;
  quantidade_animais: number | null;
  ua_real: number | null;
  data_entrada: string | null;
};

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

export async function getPiquetesAtivosParaBalanco(
  supabase: SupabaseClient<Database>
): Promise<PiqueteAtivoRow[]> {
  // Busca piquetes Em pastejo com a ocupação aberta (sem data_saida_real)
  const { data, error } = await supabase
    .from('piquetes')
    .select(
      'id, nome, area_ha, ua_suportada, pastagens(nome, especie_forrageira, sistema_pastejo), ocupacoes_piquete(id, quantidade_animais, ua_real, data_entrada, data_saida_real)'
    )
    .eq('status', 'Em pastejo');

  if (error || !data) return [];

  const rows: PiqueteAtivoRow[] = [];

  for (const p of data as unknown as Array<{
    id: string;
    nome: string;
    area_ha: number;
    ua_suportada: number | null;
    pastagens: { nome: string; especie_forrageira: string | null; sistema_pastejo: string } | null;
    ocupacoes_piquete: Array<{
      id: string;
      quantidade_animais: number | null;
      ua_real: number | null;
      data_entrada: string;
      data_saida_real: string | null;
    }>;
  }>) {
    const ocupacaoAtiva = p.ocupacoes_piquete?.find((o) => !o.data_saida_real) ?? null;

    rows.push({
      piquete_id: p.id,
      piquete_nome: p.nome,
      area_ha: p.area_ha,
      ua_suportada: p.ua_suportada,
      sistema_pastejo: p.pastagens?.sistema_pastejo ?? 'rotacionado',
      especie_forrageira: p.pastagens?.especie_forrageira ?? null,
      pastagem_nome: p.pastagens?.nome ?? '',
      ocupacao_id: ocupacaoAtiva?.id ?? null,
      quantidade_animais: ocupacaoAtiva?.quantidade_animais ?? null,
      ua_real: ocupacaoAtiva?.ua_real ?? null,
      data_entrada: ocupacaoAtiva?.data_entrada ?? null,
    });
  }

  return rows;
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
