import { supabase } from '@/lib/supabase';
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
  litros: number;
  valor_por_litro: number | null;
  valor_total: number | null;
  tipo_combustivel: string | null;
  operador: string | null;
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
  id: string; maquina_id: string; data: string; litros: number;
  valor_por_litro: number | null; valor_total: number | null;
  tipo_combustivel: string | null; operador: string | null;
  maquinas: { nome: string } | null;
};

type RawUso = {
  id: string; maquina_id: string; data_uso: string; horas_trabalhadas: number;
  operacao: string | null; operador: string | null; observacoes: string | null;
  maquinas: { nome: string } | null;
};

export async function getRelatorioFrota(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioFrotaResult> {
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
      .select('id, maquina_id, data, litros, valor_por_litro, valor_total, tipo_combustivel, operador, maquinas(nome)')
      .eq('fazenda_id', fazendaId)
      .gte('data', gte)
      .lte('data', lte)
      .order('data', { ascending: false })
      .limit(10000),

    supabase
      .from('uso_maquinas')
      .select('id, maquina_id, data_uso, horas_trabalhadas, operacao, operador, observacoes, maquinas(nome)')
      .eq('fazenda_id', fazendaId)
      .gte('data_uso', gte)
      .lte('data_uso', lte)
      .order('data_uso', { ascending: false })
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
    data: a.data, litros: a.litros, valor_por_litro: a.valor_por_litro,
    valor_total: a.valor_total, tipo_combustivel: a.tipo_combustivel, operador: a.operador,
  }));

  const usos: FrotaUsoRow[] = ((usosRes.data ?? []) as unknown as RawUso[]).map((u) => ({
    id: u.id, maquina_id: u.maquina_id, maquina_nome: u.maquinas?.nome ?? '',
    data_uso: u.data_uso, horas_trabalhadas: u.horas_trabalhadas,
    operacao: u.operacao, operador: u.operador, observacoes: u.observacoes,
  }));

  return { maquinas, manutencoes, abastecimentos, usos };
}
