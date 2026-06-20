import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';

export interface FrotaMaquinaRow {
  id: string;
  nome: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  identificacao: string | null;
  consumo_medio_litros_hora: number | null;
  valor_aquisicao: number | null;
  status: string;
}

export interface FrotaManutencaoRow {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  tipo: string;
  descricao: string | null;
  data_prevista: string;
  data_realizada: string | null;
  custo: number | null;
  status: string;
  responsavel: string | null;
}

export interface FrotaAbastecimentoRow {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  data: string;
  litros: number | null;
  preco_litro: number | null;
  valor: number | null;
  combustivel: string | null;
  fornecedor: string | null;
}

export interface FrotaUsoRow {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  data_uso: string;
  horas_trabalhadas: number;
  operacao: string | null;
  operador: string | null;
  observacoes: string | null;
}

export interface RelatorioFrotaResult {
  maquinas: FrotaMaquinaRow[];
  manutencoes: FrotaManutencaoRow[];
  abastecimentos: FrotaAbastecimentoRow[];
  usos: FrotaUsoRow[];
}

type RawManutencao = {
  id: string; maquina_id: string; tipo: string; descricao: string | null;
  data_prevista: string; data_realizada: string | null; custo: number | null;
  status: string; responsavel: string | null;
  maquinas: { nome: string } | null;
};

type RawAbastecimento = {
  id: string; maquina_id: string; data: string; litros: number | null;
  preco_litro: number | null; valor: number | null;
  combustivel: string | null; fornecedor: string | null;
  maquinas: { nome: string } | null;
};

type RawUso = {
  id: string; maquina_id: string; data: string; horas: number | null;
  tipo_operacao: string | null;
  maquinas: { nome: string } | null;
};

export async function getRelatorioFrota(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioFrotaResult> {
  const supabase = await createSupabaseServerClient();
  const { gte, lte } = toUtcRangeFromLocal(from, to);

  const [maquinasRes, manutencoesRes, abastecimentosRes, usosRes] = await Promise.all([
    supabase
      .from('maquinas')
      .select('id, nome, tipo, marca, modelo, ano, identificacao, consumo_medio_lh, valor_aquisicao, status')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true }),

    supabase
      .from('manutencoes')
      .select('id, maquina_id, tipo, descricao, data_prevista, data_realizada, custo, status, responsavel, maquinas(nome)')
      .eq('fazenda_id', fazendaId)
      .gte('data_prevista', gte)
      .lte('data_prevista', lte)
      .order('data_prevista', { ascending: false })
      .limit(10000),

    supabase
      .from('abastecimentos')
      .select('id, maquina_id, data, litros, preco_litro, valor, combustivel, fornecedor, maquinas(nome)')
      .eq('fazenda_id', fazendaId)
      .gte('data', gte)
      .lte('data', lte)
      .order('data', { ascending: false })
      .limit(10000),

    supabase
      .from('uso_maquinas')
      .select('id, maquina_id, data, horas, tipo_operacao, maquinas(nome)')
      .eq('fazenda_id', fazendaId)
      .gte('data', gte)
      .lte('data', lte)
      .order('data', { ascending: false })
      .limit(10000),
  ]);

  if (maquinasRes.error) throw maquinasRes.error;
  if (manutencoesRes.error) throw manutencoesRes.error;
  if (abastecimentosRes.error) throw abastecimentosRes.error;
  if (usosRes.error) throw usosRes.error;

  const maquinas: FrotaMaquinaRow[] = (maquinasRes.data ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    tipo: m.tipo,
    marca: m.marca ?? null,
    modelo: m.modelo ?? null,
    ano: m.ano ?? null,
    identificacao: m.identificacao ?? null,
    consumo_medio_litros_hora: (m as unknown as { consumo_medio_lh: number | null }).consumo_medio_lh ?? null,
    valor_aquisicao: m.valor_aquisicao ?? null,
    status: (m as unknown as { status: string }).status ?? '',
  }));

  const manutencoes: FrotaManutencaoRow[] = ((manutencoesRes.data ?? []) as unknown as RawManutencao[]).map((m) => ({
    id: m.id, maquina_id: m.maquina_id, maquina_nome: m.maquinas?.nome ?? '',
    tipo: m.tipo, descricao: m.descricao, data_prevista: m.data_prevista,
    data_realizada: m.data_realizada, custo: m.custo, status: m.status, responsavel: m.responsavel,
  }));

  const abastecimentos: FrotaAbastecimentoRow[] = ((abastecimentosRes.data ?? []) as unknown as RawAbastecimento[]).map((a) => ({
    id: a.id, maquina_id: a.maquina_id, maquina_nome: a.maquinas?.nome ?? '',
    data: a.data, litros: a.litros, preco_litro: a.preco_litro,
    valor: a.valor, combustivel: a.combustivel, fornecedor: a.fornecedor,
  }));

  const usos: FrotaUsoRow[] = ((usosRes.data ?? []) as unknown as RawUso[]).map((u) => ({
    id: u.id, maquina_id: u.maquina_id, maquina_nome: u.maquinas?.nome ?? '',
    data_uso: u.data, horas_trabalhadas: u.horas ?? 0,
    operacao: u.tipo_operacao, operador: null, observacoes: null,
  }));

  return { maquinas, manutencoes, abastecimentos, usos };
}
